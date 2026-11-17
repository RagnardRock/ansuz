import sql from '../lib/db.js'
import { withCors } from '../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const [month, all] = await Promise.all([
    sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url,
        ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN r.id END)::int AS monthly_review_count
      FROM works w
      JOIN reviews r ON r.work_id = w.id
      WHERE w.approved = true AND r.created_at > NOW() - INTERVAL '30 days'
      GROUP BY w.id
      ORDER BY monthly_review_count DESC, avg_rating DESC NULLS LAST
      LIMIT 15
    `,
    sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url,
        ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN r.id END)::int AS monthly_review_count
      FROM works w
      JOIN reviews r ON r.work_id = w.id
      WHERE w.approved = true
      GROUP BY w.id
      ORDER BY review_count DESC, avg_rating DESC NULLS LAST
      LIMIT 15
    `,
  ])

  return res.status(200).json({ month, all })
})
