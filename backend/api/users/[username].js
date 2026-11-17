import sql from '../../lib/db.js'
import { optionalAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = optionalAuth(req)
  const { username } = req.query

  const [user] = await sql`
    SELECT id, username, avatar_url, bio, created_at FROM users WHERE username = ${username}
  `
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const [{ followers_count }] = await sql`
    SELECT COUNT(*)::int AS followers_count FROM follows WHERE following_id = ${user.id}
  `
  const [{ following_count }] = await sql`
    SELECT COUNT(*)::int AS following_count FROM follows WHERE follower_id = ${user.id}
  `

  const isFollowing = me
    ? !!(await sql`SELECT 1 FROM follows WHERE follower_id = ${me.userId} AND following_id = ${user.id}`).length
    : false

  const reviews = await sql`
    SELECT
      r.id, r.rating, r.description, r.created_at, r.updated_at,
      w.id AS work_id, w.title, w.type, w.cover_url,
      COUNT(uv.user_id)::int AS upvote_count
    FROM reviews r
    JOIN works w ON w.id = r.work_id
    LEFT JOIN upvotes uv ON uv.review_id = r.id
    WHERE r.user_id = ${user.id}
    GROUP BY r.id, w.id
    ORDER BY r.created_at DESC
  `

  return res.status(200).json({ ...user, followers_count, following_count, is_following: isFollowing, reviews })
})
