import sql from '../../lib/db.js'
import { requireAuth, optionalAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'
import { buildAffiliateUrl } from './affiliateUrl.js'
import { nettoyerTexte } from '../../lib/texte.js'

const RATE_LIMIT = 100
const VALID_TYPES = ['book', 'manga', 'film', 'series', 'music', 'game']

export default withCors(async (req, res) => {
  if (req.method === 'GET') {
    const me = optionalAuth(req)
    const userId = me?.userId ?? null

    const [isAdmin] = me
      ? await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
      : [null]

    const {
      type, search, sort = 'date-desc',
      genres, year_from, year_to, min_rating,
      following, user: userFilter,
      language, status, origin, platforms,
      page, per_page,
    } = req.query

    const typeVal = type || null
    const searchPattern = search?.trim() ? `%${search.trim()}%` : null
    const genresArr = genres
      ? (Array.isArray(genres) ? genres : genres.split(',').map((s) => s.trim()).filter(Boolean))
      : null
    const yearFromVal = year_from ? parseInt(year_from) : null
    const yearToVal = year_to ? parseInt(year_to) : null
    const minRatingVal = min_rating ? parseFloat(min_rating) : null
    const followingMode = following === 'true' && !!userId
    const platformsArr = platforms
      ? (Array.isArray(platforms) ? platforms : platforms.split(',').map((s) => s.trim()).filter(Boolean))
      : null
    const languageVal = language || null
    const statusVal = status || null
    const originVal = origin || null
    const userFilterVal = userFilter || null
    const perPageVal = Math.min(Math.max(parseInt(per_page) || 24, 1), 100)
    const pageVal = Math.max(parseInt(page) || 1, 1)
    const offsetVal = (pageVal - 1) * perPageVal

    const rows = await sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url, w.link,
        w.approved, w.cdn_source, w.created_by, w.created_at,
        w.release_year, w.genres, w.description,
        w.page_count, w.publisher, w.isbn, w.language,
        w.status, w.volume_count, w.origin, w.duration, w.main_cast,
        w.season_count, w.platforms, w.track_count,
        u.username AS created_by_username,
        ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN r.id END)::int AS monthly_review_count,
        (SELECT row_to_json(ur) FROM (
          SELECT rv.id, rv.rating, rv.description
          FROM reviews rv
          WHERE rv.work_id = w.id AND rv.user_id = ${userId}
        ) ur) AS my_review,
        COUNT(*) OVER() AS total_count
      FROM works w
      LEFT JOIN users u ON u.id = w.created_by
      LEFT JOIN reviews r ON r.work_id = w.id
      WHERE (w.approved = true OR w.created_by = ${userId} OR ${isAdmin?.is_admin ?? false})
        AND (${typeVal}::text IS NULL OR w.type = ${typeVal})
        AND (${searchPattern}::text IS NULL OR w.title ILIKE ${searchPattern} OR w.author ILIKE ${searchPattern})
        AND (${yearFromVal}::int IS NULL OR w.release_year >= ${yearFromVal})
        AND (${yearToVal}::int IS NULL OR w.release_year <= ${yearToVal})
        AND (${genresArr}::text[] IS NULL OR w.genres && ${genresArr}::text[])
        AND (${languageVal}::text IS NULL OR w.language = ${languageVal})
        AND (${statusVal}::text IS NULL OR w.status = ${statusVal})
        AND (${originVal}::text IS NULL OR w.origin = ${originVal})
        AND (${platformsArr}::text[] IS NULL OR w.platforms && ${platformsArr}::text[])
        AND (NOT ${followingMode} OR EXISTS (
          SELECT 1 FROM reviews r2
          JOIN follows f ON f.following_id = r2.user_id
          WHERE r2.work_id = w.id AND f.follower_id = ${userId}
        ))
        AND (${userFilterVal}::text IS NULL OR EXISTS (
          SELECT 1 FROM reviews r3
          JOIN users u2 ON u2.id = r3.user_id
          WHERE r3.work_id = w.id AND u2.username = ${userFilterVal}
        ))
      GROUP BY w.id, u.username
      HAVING (${minRatingVal}::float IS NULL OR ROUND(AVG(r.rating)::numeric, 1)::float >= ${minRatingVal})
      ORDER BY
        CASE WHEN ${sort} = 'alpha' THEN w.title END ASC NULLS LAST,
        CASE WHEN ${sort} = 'rating' THEN ROUND(AVG(r.rating)::numeric, 1) END DESC NULLS LAST,
        CASE WHEN ${sort} = 'reviews' THEN COUNT(DISTINCT r.id)::float END DESC NULLS LAST,
        CASE WHEN ${sort} = 'date-asc' THEN EXTRACT(EPOCH FROM w.created_at) END ASC NULLS LAST,
        w.created_at DESC
      LIMIT ${perPageVal}
      OFFSET ${offsetVal}
    `
    const total = rows.length > 0 ? parseInt(rows[0].total_count) : 0
    const works = rows.map(({ total_count, ...w }) => w)
    return res.status(200).json({
      works,
      total,
      page: pageVal,
      per_page: perPageVal,
      total_pages: Math.ceil(total / perPageVal),
    })
  }

  if (req.method === 'POST') {
    const me = requireAuth(req)

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM works
      WHERE created_by = ${me.userId}
        AND created_at > NOW() - INTERVAL '1 hour'
    `
    if (count >= RATE_LIMIT) {
      return res.status(429).json({ error: `Limite atteinte : ${RATE_LIMIT} œuvres par heure maximum` })
    }

    const {
      title, author, type = 'book', cover_url, link, rating,
      description, synopsis, cdn_source,
      release_year, genres, page_count, publisher, isbn, language,
      status, volume_count, origin, duration, main_cast, season_count,
      platforms, track_count,
    } = req.body ?? {}

    if (!title) return res.status(400).json({ error: 'Le titre est requis' })
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide' })
    if (rating !== undefined && (rating < 0.5 || rating > 5 || !Number.isInteger(rating * 2))) {
      return res.status(400).json({ error: 'La note doit être entre 0.5 et 5 (multiples de 0.5)' })
    }
    if (link && !/^https?:\/\//i.test(link)) {
      return res.status(400).json({ error: 'Le lien doit commencer par http:// ou https://' })
    }

    // Lien affilié automatique si CDN et aucun lien fourni par l'utilisateur
    const finalLink = link || (cdn_source ? buildAffiliateUrl({ cdn_source, type, title, isbn, release_year }) : null)

    // Approuvé automatiquement si les données viennent d'un CDN
    const approved = !!cdn_source

    const [{ id: workId }] = await sql`
      INSERT INTO works (
        title, author, type, cover_url, link, created_by,
        approved, cdn_source,
        description, release_year, genres, page_count, publisher, isbn, language,
        status, volume_count, origin, duration, main_cast, season_count,
        platforms, track_count
      )
      VALUES (
        ${title}, ${author ?? null}, ${type}, ${cover_url ?? null}, ${finalLink ?? null}, ${me.userId},
        ${approved}, ${cdn_source ?? null},
        ${nettoyerTexte(synopsis)}, ${release_year ?? null}, ${genres ?? null}, ${page_count ?? null},
        ${publisher ?? null}, ${isbn ?? null}, ${language ?? null}, ${status ?? null},
        ${volume_count ?? null}, ${origin ?? null}, ${duration ?? null}, ${main_cast ?? null},
        ${season_count ?? null}, ${platforms ?? null}, ${track_count ?? null}
      )
      RETURNING id
    `

    if (rating !== undefined || description) {
      await sql`
        INSERT INTO reviews (work_id, user_id, rating, description)
        VALUES (${workId}, ${me.userId}, ${rating ?? null}, ${description ?? null})
      `
    }

    const [work] = await sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url, w.link,
        w.approved, w.cdn_source, w.created_by, w.created_at,
        w.release_year, w.genres, w.description,
        w.page_count, w.publisher, w.isbn, w.language,
        w.status, w.volume_count, w.origin, w.duration, w.main_cast,
        w.season_count, w.platforms, w.track_count,
        u.username AS created_by_username,
        ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        (SELECT row_to_json(ur) FROM (
          SELECT rv.id, rv.rating, rv.description
          FROM reviews rv
          WHERE rv.work_id = w.id AND rv.user_id = ${me.userId}
        ) ur) AS my_review
      FROM works w
      LEFT JOIN users u ON u.id = w.created_by
      LEFT JOIN reviews r ON r.work_id = w.id
      WHERE w.id = ${workId}
      GROUP BY w.id, u.username
    `
    return res.status(201).json(work)
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
