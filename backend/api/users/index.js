import sql from '../../lib/db.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { q } = req.query
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Requête trop courte (2 caractères minimum)' })
  }

  const users = await sql`
    SELECT
      u.username, u.avatar_url,
      COUNT(r.id)::int AS review_count
    FROM users u
    LEFT JOIN reviews r ON r.user_id = u.id
    WHERE u.username ILIKE ${'%' + q.trim() + '%'}
    GROUP BY u.id
    ORDER BY u.username
    LIMIT 10
  `

  return res.status(200).json(users)
})
