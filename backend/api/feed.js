import sql from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { withCors } from '../lib/cors.js'

const MAX_PER_USER = 5

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)

  const feed = await sql`
    WITH ranked AS (
      SELECT
        r.id         AS review_id,
        r.rating,
        r.description,
        r.created_at,
        u.username,
        u.avatar_url,
        w.id         AS work_id,
        w.title,
        w.type,
        w.cover_url,
        ROW_NUMBER() OVER (PARTITION BY r.user_id ORDER BY r.created_at DESC) AS rn
      FROM follows f
      JOIN reviews r ON r.user_id = f.following_id
      JOIN users u   ON u.id = r.user_id
      JOIN works w   ON w.id = r.work_id
      WHERE f.follower_id = ${me.userId}
    )
    SELECT
      r.review_id, r.rating, r.description, r.created_at,
      r.username, r.avatar_url,
      r.work_id, r.title, r.type, r.cover_url,
      COUNT(uv.user_id)::int AS upvote_count,
      EXISTS(
        SELECT 1 FROM upvotes WHERE review_id = r.review_id AND user_id = ${me.userId}
      ) AS user_upvoted
    FROM ranked r
    LEFT JOIN upvotes uv ON uv.review_id = r.review_id
    WHERE r.rn <= ${MAX_PER_USER}
    GROUP BY
      r.review_id, r.rating, r.description, r.created_at,
      r.username, r.avatar_url,
      r.work_id, r.title, r.type, r.cover_url
    ORDER BY r.created_at DESC
  `

  return res.status(200).json(feed)
})
