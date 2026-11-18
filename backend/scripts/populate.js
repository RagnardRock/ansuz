/**
 * Populate the Ansuz DB with popular works from CDNs.
 *
 * Usage:
 *   node scripts/populate.js
 *   node scripts/populate.js --count=1000 --no-adult --dry-run
 *   node scripts/populate.js --types=film,series --count=500
 *
 * Requires in .env.local: DATABASE_URL, TMDB_API_KEY, RAWG_API_KEY
 * Optional: GOOGLE_BOOKS_API_KEY
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { neon } from '@neondatabase/serverless'
import { nettoyerTexte } from '../lib/texte.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: [resolve(__dirname, '../.env.local'), resolve(__dirname, '../.env')] })

const DRY_RUN   = process.argv.includes('--dry-run')
const NO_ADULT  = process.argv.includes('--no-adult')
const COUNT     = parseInt(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] ?? '50')
const TYPES_ARG = process.argv.find(a => a.startsWith('--types='))
const ONLY_TYPES = TYPES_ARG ? TYPES_ARG.split('=')[1].split(',') : null

let sql

const delay = ms => new Promise(r => setTimeout(r, ms))

/** Exécute fn sur des lots de batchSize items en parallèle, avec pause entre chaque lot. */
async function batchMap(items, fn, batchSize = 5, delayMs = 200) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const settled = await Promise.allSettled(batch.map(fn))
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value) results.push(r.value)
    }
    if (i + batchSize < items.length) await delay(delayMs)
  }
  return results
}

function normalizeKey(title, author) {
  return `${title?.toLowerCase().trim()}||${author?.toLowerCase().trim() ?? ''}`
}

// ─── Dedup ────────────────────────────────────────────────────────────────────

async function loadExistingKeys() {
  process.stdout.write('Chargement des œuvres existantes... ')
  const rows = await sql`SELECT title, author FROM works`
  const set = new Set(rows.map(r => normalizeKey(r.title, r.author)))
  console.log(`${set.size} trouvées`)
  return set
}

// ─── Books (Google Books) ─────────────────────────────────────────────────────

const BOOK_SUBJECTS = [
  'fiction', 'science+fiction', 'fantasy', 'mystery', 'thriller',
  'biography', 'history', 'science', 'philosophy', 'horror',
  'adventure', 'classic+literature', 'poetry', 'psychology', 'economics',
  'cooking', 'travel', 'art', 'comics', 'young+adult',
  'romance', 'true+crime', 'technology', 'detective', 'self+help',
  'manga', 'graphic+novel', 'children', 'religion', 'sports',
]

async function fetchBooks(count) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const results = []
  const seen = new Set()

  for (const subject of BOOK_SUBJECTS) {
    if (results.length >= count) break
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${subject}&maxResults=40&printType=books&orderBy=relevance${apiKey ? `&key=${apiKey}` : ''}`
      const res = await fetch(url)
      if (!res.ok) continue
      const data = await res.json()
      for (const item of data.items ?? []) {
        if (results.length >= count) break
        const info = item.volumeInfo
        if (!info.title) continue
        const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
        const cover_url = thumb ? thumb.replace('http://', 'https://').replace('&edge=curl', '') : null
        if (!cover_url) continue
        const k = `${info.title.toLowerCase()}||${(info.authors?.[0] ?? '').toLowerCase()}`
        if (seen.has(k)) continue
        seen.add(k)
        results.push({
          title: info.title,
          author: info.authors?.[0] ?? null,
          type: 'book',
          cover_url,
          cdn_source: 'googlebooks',
          release_year: info.publishedDate ? parseInt(info.publishedDate) || null : null,
          description: info.description ?? null,
          genres: info.categories ?? null,
          page_count: info.pageCount ?? null,
          publisher: info.publisher ?? null,
          isbn: info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier ?? null,
          language: info.language ?? null,
        })
      }
    } catch { /* skip */ }
    await delay(200)
  }
  return results
}

// ─── Manga / Manhwa / Manhua (AniList) ───────────────────────────────────────

async function fetchAniListByOrigin(country, count) {
  const perPage = 50
  const pages = Math.ceil(count / perPage)
  const results = []

  for (let page = 1; page <= pages; page++) {
    try {
      const body = JSON.stringify({
        query: `query($country: CountryCode, $page: Int) {
          Page(page: $page, perPage: ${perPage}) {
            media(type: MANGA, sort: POPULARITY_DESC, countryOfOrigin: $country, isAdult: false) {
              title { romaji english }
              coverImage { extraLarge large }
              staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
              startDate { year }
              description(asHtml: false)
              genres status volumes countryOfOrigin
            }
          }
        }`,
        variables: { country, page },
      })
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) break
      const data = await res.json()
      const media = (data.data?.Page?.media ?? []).filter(m => m.coverImage?.extraLarge || m.coverImage?.large)
      if (!media.length) break
      results.push(...media.map(m => ({
        title: m.title.english ?? m.title.romaji,
        author: m.staff?.nodes?.[0]?.name?.full ?? null,
        type: 'manga',
        cover_url: m.coverImage.extraLarge ?? m.coverImage.large,
        cdn_source: 'anilist',
        release_year: m.startDate?.year ?? null,
        description: m.description ?? null,
        genres: m.genres ?? null,
        status: m.status ?? null,
        volume_count: m.volumes ?? null,
        origin: m.countryOfOrigin ?? null,
      })))
    } catch { /* skip */ }
    await delay(700) // AniList : ~90 req/min
  }
  return results.slice(0, count)
}

async function fetchMangas(count) {
  const jp = Math.floor(count * 0.5)   // manga japonais
  const kr = Math.floor(count * 0.25)  // manhwa coréens
  const cn = count - jp - kr           // manhua chinois
  console.log(`  AniList: ${jp} JP · ${kr} KR · ${cn} CN`)
  const jpRes = await fetchAniListByOrigin('JP', jp)
  const krRes = await fetchAniListByOrigin('KR', kr)
  const cnRes = await fetchAniListByOrigin('CN', cn)
  return [...jpRes, ...krRes, ...cnRes]
}

// ─── Films / Séries (TMDB) ───────────────────────────────────────────────────

async function fetchTMDB(mediaType, count) {
  const token = process.env.TMDB_API_KEY
  if (!token) { console.warn(`  ⚠️  TMDB_API_KEY manquant — skip ${mediaType}`); return [] }

  const headers = { Authorization: `Bearer ${token}` }
  const endpoint = mediaType === 'tv' ? 'tv' : 'movie'
  const pages = Math.ceil(count / 20)
  const candidates = []

  for (let page = 1; page <= pages; page++) {
    try {
      const adult = NO_ADULT ? '&include_adult=false' : ''
      const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/popular?language=fr-FR&page=${page}${adult}`, { headers })
      const data = await res.json()
      candidates.push(...(data.results ?? []).filter(m => m.poster_path && (!NO_ADULT || !m.adult)))
    } catch { /* skip */ }
    await delay(250)
  }

  console.log(`  TMDB ${mediaType} : ${candidates.length} candidats, chargement des détails...`)

  return batchMap(
    candidates.slice(0, count),
    async (c) => {
      const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${c.id}?append_to_response=credits&language=fr-FR`, { headers })
      const det = await res.json()
      const isMovie = mediaType === 'movie'
      return {
        title: det.title ?? det.name,
        author: isMovie
          ? det.credits?.crew?.find(p => p.job === 'Director')?.name ?? null
          : det.created_by?.[0]?.name ?? null,
        type: isMovie ? 'film' : 'series',
        cover_url: `https://image.tmdb.org/t/p/w342${c.poster_path}`,
        cdn_source: 'tmdb',
        release_year: isMovie
          ? parseInt(det.release_date?.substring(0, 4)) || null
          : parseInt(det.first_air_date?.substring(0, 4)) || null,
        description: det.overview || null,
        genres: det.genres?.map(g => g.name) ?? null,
        duration: isMovie ? det.runtime ?? null : det.episode_run_time?.[0] ?? null,
        main_cast: det.credits?.cast?.slice(0, 5).map(p => p.name) ?? null,
        season_count: isMovie ? null : det.number_of_seasons ?? null,
        status: isMovie ? null : det.status ?? null,
      }
    },
    5,
    250,
  )
}

// ─── Musique (Deezer) ─────────────────────────────────────────────────────────

async function fetchDeezerAlbumDetails(candidates) {
  return batchMap(
    candidates,
    async (a) => {
      const det = await fetch(`https://api.deezer.com/album/${a.id}`).then(r => r.json())
      const artistName = det.artist?.name ?? a.artist?.name ?? null
      if (!det.title) return null
      return {
        title: artistName ? `${det.title} — ${artistName}` : det.title,
        author: artistName,
        type: 'music',
        cover_url: a.cover_xl ?? a.cover_big,
        cdn_source: 'deezer',
        release_year: det.release_date ? parseInt(det.release_date) || null : null,
        genres: det.genres?.data?.map(g => g.name) ?? null,
        track_count: det.nb_tracks ?? null,
      }
    },
    5,
    200,
  )
}

async function fetchMusic(count) {
  const seen = new Set()
  const candidates = []

  const addAlbums = (albums) => {
    for (const a of albums) {
      if (!(a.cover_xl || a.cover_big)) continue
      if (seen.has(a.id)) continue
      seen.add(a.id)
      candidates.push(a)
    }
  }

  // Chart global
  try {
    const res = await fetch('https://api.deezer.com/chart/0/albums?limit=100')
    const data = await res.json()
    addAlbums(data.data ?? [])
  } catch { /* skip */ }

  if (candidates.length < count) {
    // Charts par genre
    try {
      const res = await fetch('https://api.deezer.com/genre')
      const data = await res.json()
      const genres = (data.data ?? []).filter(g => g.id > 0)
      for (const genre of genres) {
        if (candidates.length >= count * 1.5) break
        try {
          const r = await fetch(`https://api.deezer.com/chart/${genre.id}/albums?limit=100`)
          const d = await r.json()
          addAlbums(d.data ?? [])
        } catch { /* skip */ }
        await delay(200)
      }
    } catch { /* skip */ }
  }

  console.log(`  Deezer : ${candidates.length} albums, chargement des détails...`)
  return fetchDeezerAlbumDetails(candidates.slice(0, count))
}

// ─── Jeux (RAWG) ─────────────────────────────────────────────────────────────

const RAWG_ADULT_GENRES = new Set(['adult', 'eroge', 'hentai'])

async function fetchGames(count) {
  const key = process.env.RAWG_API_KEY
  if (!key) { console.warn('  ⚠️  RAWG_API_KEY manquant — skip games'); return [] }

  const pageSize = 40
  const pages = Math.ceil(count / pageSize)
  const candidates = []

  for (let page = 1; page <= pages; page++) {
    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${key}&ordering=-rating&page_size=${pageSize}&page=${page}&metacritic=60,100&exclude_additions=true`
      )
      if (!res.ok) break
      const data = await res.json()
      const games = (data.results ?? []).filter(g => {
        if (!g.background_image) return false
        if (NO_ADULT && g.genres?.some(genre => RAWG_ADULT_GENRES.has(genre.slug))) return false
        return true
      })
      candidates.push(...games)
      if (!data.next) break
    } catch { /* skip */ }
    await delay(200)
  }

  console.log(`  RAWG : ${candidates.length} jeux, chargement des détails...`)

  return batchMap(
    candidates.slice(0, count),
    async (g) => {
      const det = await fetch(`https://api.rawg.io/api/games/${g.id}?key=${key}`).then(r => r.json())
      return {
        title: g.name,
        author: det.developers?.[0]?.name ?? null,
        type: 'game',
        cover_url: g.background_image,
        cdn_source: 'rawg',
        release_year: g.released ? parseInt(g.released) || null : null,
        description: det.description_raw ?? null,
        genres: g.genres?.map(x => x.name) ?? null,
        platforms: g.platforms?.map(p => p.platform.name) ?? null,
        publisher: det.publishers?.[0]?.name ?? null,
      }
    },
    5,
    250,
  )
}

// ─── DB insert ────────────────────────────────────────────────────────────────

async function insertWork(w) {
  await sql`
    INSERT INTO works (
      title, author, type, cover_url, cdn_source, approved,
      description, release_year, genres, page_count, publisher, isbn, language,
      status, volume_count, origin, duration, main_cast, season_count,
      platforms, track_count
    ) VALUES (
      ${w.title}, ${w.author ?? null}, ${w.type}, ${w.cover_url ?? null},
      ${w.cdn_source}, true,
      ${nettoyerTexte(w.description)}, ${w.release_year ?? null}, ${w.genres ?? null},
      ${w.page_count ?? null}, ${w.publisher ?? null}, ${w.isbn ?? null},
      ${w.language ?? null}, ${w.status ?? null}, ${w.volume_count ?? null},
      ${w.origin ?? null}, ${w.duration ?? null}, ${w.main_cast ?? null},
      ${w.season_count ?? null}, ${w.platforms ?? null}, ${w.track_count ?? null}
    )
  `
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const FETCHERS = {
  book:   { label: '📚 Livres (Google Books)',       fn: () => fetchBooks(COUNT) },
  manga:  { label: '🎌 Manga / Manhwa / Manhua',     fn: () => fetchMangas(COUNT) },
  film:   { label: '🎬 Films (TMDB)',                fn: () => fetchTMDB('movie', COUNT) },
  series: { label: '📺 Séries (TMDB)',               fn: () => fetchTMDB('tv', COUNT) },
  music:  { label: '🎵 Musique (Deezer)',             fn: () => fetchMusic(COUNT) },
  game:   { label: '🎮 Jeux (RAWG top rated)',        fn: () => fetchGames(COUNT) },
}

async function main() {
  sql = neon(process.env.DATABASE_URL)
  console.log(`=== Populate Ansuz DB — count=${COUNT}${NO_ADULT ? ' · no-adult' : ''}${DRY_RUN ? ' · dry-run' : ''} ===\n`)

  const existingKeys = await loadExistingKeys()
  const allWorks = []

  for (const [type, { label, fn }] of Object.entries(FETCHERS)) {
    if (ONLY_TYPES && !ONLY_TYPES.includes(type)) continue
    console.log(`\n${label}...`)
    const works = await fn().catch(e => { console.error(`  erreur: ${e.message}`); return [] })
    console.log(`  ${works.length} trouvés`)
    allWorks.push(...works)
  }

  console.log(`\n📊 Total : ${allWorks.length} œuvres à traiter\n`)

  let inserted = 0, skipped = 0, errors = 0

  for (const work of allWorks) {
    if (!work.title?.trim()) { skipped++; continue }

    const key = normalizeKey(work.title, work.author)
    if (existingKeys.has(key)) { skipped++; continue }

    if (DRY_RUN) {
      console.log(`  [dry] ${work.type.padEnd(6)} ${work.title}${work.author ? ` — ${work.author}` : ''}`)
      existingKeys.add(key)
      inserted++
      continue
    }

    try {
      await insertWork(work)
      console.log(`  ✓ ${work.type.padEnd(6)} ${work.title}`)
      existingKeys.add(key)
      inserted++
    } catch (e) {
      console.error(`  ✗ ${work.title}: ${e.message}`)
      errors++
    }
    await delay(30)
  }

  console.log(`\n✅ Terminé : ${inserted} insérées, ${skipped} skippées, ${errors} erreurs`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
