import sql from '../../lib/db.js'
import { withCors } from '../../lib/cors.js'

const VALID_TYPES = ['book', 'manga', 'film', 'series', 'music', 'game']

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const rawTypes = req.query.types
  const types = rawTypes
    ? rawTypes.split(',').filter((t) => VALID_TYPES.includes(t))
    : VALID_TYPES

  if (types.length === 0) return res.status(400).json({ error: 'Types invalides' })

  const [work] = await sql`
    SELECT
      w.id, w.title, w.author, w.type, w.cover_url, w.link,
      w.description, w.release_year, w.genres,
      w.page_count, w.publisher, w.language, w.duration,
      w.season_count, w.track_count, w.platforms, w.main_cast,
      ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
      COUNT(DISTINCT r.id)::int AS review_count
    FROM works w
    LEFT JOIN reviews r ON r.work_id = w.id
    WHERE w.approved = true
      AND w.type = ANY(${types})
      AND w.cover_url IS NOT NULL
    GROUP BY w.id
    ORDER BY RANDOM()
    LIMIT 1
  `

  if (!work) return res.status(404).json({ error: 'Aucune œuvre trouvée' })

  res.status(200).json(work)
})
