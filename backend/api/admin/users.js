import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const [admin] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
  if (!admin?.is_admin) return res.status(403).json({ error: 'Réservé aux administrateurs' })

  const users = await sql`
    SELECT
      u.id, u.username, u.email, u.avatar_url, u.is_admin, u.created_at,
      COUNT(DISTINCT r.id)::int AS review_count,
      COUNT(DISTINCT f_in.follower_id)::int AS followers_count,
      COUNT(DISTINCT f_out.following_id)::int AS following_count
    FROM users u
    LEFT JOIN reviews r ON r.user_id = u.id
    LEFT JOIN follows f_in ON f_in.following_id = u.id
    LEFT JOIN follows f_out ON f_out.follower_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `

  return res.status(200).json(users)
})
