import sql from '../lib/db.js'
import { withCors } from '../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const [[{ works_count }], [{ reviews_count }], [{ users_count }], [{ avg_rating }], byType] = await Promise.all([
    sql`SELECT COUNT(*)::int AS works_count FROM works WHERE approved = true`,
    sql`SELECT COUNT(*)::int AS reviews_count FROM reviews`,
    sql`SELECT COUNT(*)::int AS users_count FROM users`,
    sql`SELECT ROUND(AVG(rating)::numeric, 1)::float AS avg_rating FROM reviews WHERE rating IS NOT NULL`,
    sql`SELECT type, COUNT(*)::int AS count FROM works WHERE approved = true GROUP BY type ORDER BY count DESC`,
  ])

  return res.status(200).json({
    works_count,
    reviews_count,
    users_count,
    avg_rating,
    by_type: Object.fromEntries(byType.map((r) => [r.type, r.count])),
  })
})
