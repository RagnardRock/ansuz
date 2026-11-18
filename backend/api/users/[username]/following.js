import sql from '../../../lib/db.js'
import { optionalAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = optionalAuth(req)
  const { username } = req.query

  const [user] = await sql`SELECT id FROM users WHERE username = ${username}`
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const viewerId = me?.userId ?? null

  const rows = await sql`
    SELECT
      u.username,
      u.avatar_url,
      EXISTS(
        SELECT 1 FROM follows WHERE follower_id = ${viewerId} AND following_id = u.id
      ) AS is_following
    FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ${user.id}
    ORDER BY u.username
  `

  return res.status(200).json(rows)
})
