import { withCors } from '../../lib/cors.js'
import { nettoyerTexte } from '../../lib/texte.js'

// ─── Google Books (livres) ────────────────────────────────────────────────────
async function searchGoogleBooks(query) {
  const key = process.env.GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books&projection=full${key ? `&key=${key}` : ''}`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return (data.items ?? [])
    .map((item) => {
      const info = item.volumeInfo
      if (!info.title) return null
      const apiThumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
      const image = apiThumb
        ? apiThumb.replace('http://', 'https://').replace('&edge=curl', '')
        : `https://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`
      return {
        source: 'googlebooks',
        title: info.title,
        image,
        author: info.authors?.[0] ?? null,
        metadata: {
          release_year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
          description: info.description ?? null,
          genres: info.categories ?? null,
          page_count: info.pageCount ?? null,
          publisher: info.publisher ?? null,
          isbn: info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier ?? null,
          language: info.language ?? null,
        },
      }
    })
    .filter(Boolean)
}

// ─── AniList (mangas) ─────────────────────────────────────────────────────────
async function searchAniList(query) {
  const body = JSON.stringify({
    query: `query($s: String) {
      Page(perPage: 8) {
        media(search: $s, type: MANGA, sort: POPULARITY_DESC) {
          title { romaji english }
          coverImage { extraLarge large }
          staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
          startDate { year }
          description(asHtml: false)
          genres
          status
          volumes
          countryOfOrigin
        }
      }
    }`,
    variables: { s: query },
  })
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) return []
  const data = await res.json()

  return (data.data?.Page?.media ?? [])
    .filter((m) => m.coverImage?.extraLarge || m.coverImage?.large)
    .map((m) => ({
      source: 'anilist',
      title: m.title.english ?? m.title.romaji,
      image: m.coverImage.extraLarge ?? m.coverImage.large,
      author: m.staff?.nodes?.[0]?.name?.full ?? null,
      metadata: {
        release_year: m.startDate?.year ?? null,
        description: nettoyerTexte(m.description),
        genres: m.genres ?? null,
        status: m.status ?? null,
        volume_count: m.volumes ?? null,
        origin: m.countryOfOrigin ?? null,
      },
    }))
}

// ─── TMDB ─────────────────────────────────────────────────────────────────────
async function searchTMDBBase(query, mediaType) {
  const token = process.env.TMDB_API_KEY
  if (!token) return []

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const endpoint = mediaType === 'tv' ? 'tv' : 'movie'

  const res = await fetch(`https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(query)}&language=fr-FR`, { headers })
  const data = await res.json()
  const candidates = (data.results ?? []).filter((m) => m.poster_path).slice(0, 6).map((m) => ({ ...m, _type: mediaType }))

  const details = await Promise.allSettled(
    candidates.map((c) =>
      fetch(`https://api.themoviedb.org/3/${c._type}/${c.id}?append_to_response=credits&language=fr-FR`, { headers }).then((r) => r.json())
    )
  )

  return details.map((d, i) => {
    if (d.status !== 'fulfilled') return null
    const det = d.value
    const c = candidates[i]
    const isMovie = c._type === 'movie'
    const director = det.credits?.crew?.find((p) => p.job === 'Director')?.name ?? null
    const main_cast = det.credits?.cast?.slice(0, 5).map((p) => p.name) ?? null
    return {
      source: 'tmdb',
      title: det.title ?? det.name,
      image: `https://image.tmdb.org/t/p/w342${c.poster_path}`,
      author: director,
      metadata: {
        release_year: isMovie
          ? parseInt(det.release_date?.substring(0, 4))
          : parseInt(det.first_air_date?.substring(0, 4)),
        description: det.overview ?? null,
        genres: det.genres?.map((g) => g.name) ?? null,
        duration: isMovie ? det.runtime ?? null : det.episode_run_time?.[0] ?? null,
        main_cast,
        season_count: isMovie ? null : det.number_of_seasons ?? null,
        status: isMovie ? null : det.status ?? null,
      },
    }
  }).filter(Boolean)
}


// ─── Open Library (livres) ───────────────────────────────────────────────────
async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,subject,number_of_pages_median,publisher,isbn,language,cover_i`
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()

  return (data.docs ?? [])
    .filter((doc) => doc.cover_i)
    .map((doc) => ({
      source: 'openlibrary',
      title: doc.title,
      image: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
      author: doc.author_name?.[0] ?? null,
      metadata: {
        release_year: doc.first_publish_year ?? null,
        genres: doc.subject?.slice(0, 5) ?? null,
        page_count: doc.number_of_pages_median ?? null,
        publisher: doc.publisher?.[0] ?? null,
        isbn: doc.isbn?.find((i) => i.length === 13) ?? null,
        language: doc.language?.[0] ?? null,
      },
    }))
}

async function searchBooksAll(query) {
  const [googlebooks, openlibrary] = await Promise.allSettled([searchGoogleBooks(query), searchOpenLibrary(query)])
  return [
    ...(googlebooks.status === 'fulfilled' ? googlebooks.value : []),
    ...(openlibrary.status === 'fulfilled' ? openlibrary.value : []),
  ]
}

// ─── iTunes (musique) ─────────────────────────────────────────────────────────
async function searchMusic(query) {
  const [byAlbum, byTerm] = await Promise.allSettled([
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&attribute=albumTerm&limit=8&media=music`).then((r) => r.json()),
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=8&media=music`).then((r) => r.json()),
  ])

  const seen = new Set()
  const results = []

  for (const settled of [byAlbum, byTerm]) {
    if (settled.status !== 'fulfilled') continue
    for (const a of (settled.value.results ?? [])) {
      if (!a.artworkUrl100 || seen.has(a.collectionId)) continue
      seen.add(a.collectionId)
      results.push({
        source: 'itunes',
        title: `${a.collectionName} — ${a.artistName}`,
        image: a.artworkUrl100.replace('100x100bb', '600x600bb'),
        author: a.artistName ?? null,
        metadata: {
          release_year: a.releaseDate ? parseInt(a.releaseDate.substring(0, 4)) : null,
          genres: a.primaryGenreName ? [a.primaryGenreName] : null,
          track_count: a.trackCount ?? null,
        },
      })
    }
  }
  return results.slice(0, 10)
}

// ─── Deezer (musique) ────────────────────────────────────────────────────────
async function searchDeezer(query) {
  const searchRes = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=8`)
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()

  const candidates = (searchData.data ?? []).filter((a) => a.cover_xl || a.cover_big)

  const details = await Promise.allSettled(
    candidates.map((a) => fetch(`https://api.deezer.com/album/${a.id}`).then((r) => r.json()))
  )

  return details.map((d, i) => {
    if (d.status !== 'fulfilled') return null
    const det = d.value
    const a = candidates[i]
    const artistName = det.artist?.name ?? a.artist?.name ?? null
    return {
      source: 'deezer',
      title: artistName ? `${det.title} — ${artistName}` : det.title,
      image: a.cover_xl ?? a.cover_big,
      author: artistName,
      metadata: {
        release_year: det.release_date ? parseInt(det.release_date.substring(0, 4)) : null,
        genres: det.genres?.data?.map((g) => g.name) ?? null,
        track_count: det.nb_tracks ?? null,
      },
    }
  }).filter(Boolean)
}

async function searchMusicAll(query) {
  const [itunes, deezer] = await Promise.allSettled([searchMusic(query), searchDeezer(query)])
  return [
    ...(itunes.status === 'fulfilled' ? itunes.value : []),
    ...(deezer.status === 'fulfilled' ? deezer.value : []),
  ]
}

// ─── RAWG (jeux vidéo) ────────────────────────────────────────────────────────
async function searchRAWG(query) {
  const key = process.env.RAWG_API_KEY
  if (!key) return []

  const searchRes = await fetch(`https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(query)}&page_size=8`)
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()

  const candidates = (searchData.results ?? []).filter((g) => g.background_image)

  // Fetch détails en parallèle pour avoir description + publisher + developer
  const details = await Promise.allSettled(
    candidates.map((g) => fetch(`https://api.rawg.io/api/games/${g.id}?key=${key}`).then((r) => r.json()))
  )

  return details
    .map((d, i) => {
      if (d.status !== 'fulfilled') return null
      const det = d.value
      const g = candidates[i]
      return {
        source: 'rawg',
        title: g.name,
        image: g.background_image,
        author: det.developers?.[0]?.name ?? null,
        metadata: {
          release_year: g.released ? parseInt(g.released.substring(0, 4)) : null,
          description: det.description_raw ?? null,
          genres: g.genres?.map((x) => x.name) ?? null,
          platforms: g.platforms?.map((p) => p.platform.name) ?? null,
          publisher: det.publishers?.[0]?.name ?? null,
        },
      }
    })
    .filter(Boolean)
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const SEARCH_BY_TYPE = {
  book:   searchBooksAll,
  manga:  searchAniList,
  film:   (q) => searchTMDBBase(q, 'movie'),
  series: (q) => searchTMDBBase(q, 'tv'),
  music:  searchMusicAll,
  game:   searchRAWG,
}

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { q, type } = req.query
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Paramètre q requis (min 2 caractères)' })
  }

  const searcher = SEARCH_BY_TYPE[type]
  if (!searcher) {
    const [books, mangas] = await Promise.allSettled([searchGoogleBooks(q), searchAniList(q)])
    return res.status(200).json([
      ...(books.status === 'fulfilled' ? books.value : []),
      ...(mangas.status === 'fulfilled' ? mangas.value : []),
    ])
  }

  const results = await searcher(q).catch(() => [])
  res.status(200).json(results)
})
