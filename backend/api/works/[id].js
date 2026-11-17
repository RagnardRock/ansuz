import sql from '../../lib/db.js'
import { requireAuth, optionalAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  const { id } = req.query

  // GET /api/works/:id — détail d'une œuvre avec tous ses avis et leurs upvotes
  if (req.method === 'GET') {
    const me = optionalAuth(req)
    const userId = me?.userId ?? null

    const [work] = await sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url, w.link,
        w.release_year, w.genres, w.description, w.page_count, w.publisher, w.isbn, w.language,
        w.status, w.volume_count, w.origin, w.duration, w.main_cast, w.season_count,
        w.platforms, w.track_count,
        w.created_by, w.created_at,
        u.username AS created_by_username,
        ROUND(AVG(r.rating)::numeric, 1)::float AS avg_rating,
        COUNT(DISTINCT r.id)::int AS review_count
      FROM works w
      LEFT JOIN users u ON u.id = w.created_by
      LEFT JOIN reviews r ON r.work_id = w.id
      WHERE w.id = ${id}
      GROUP BY w.id, u.username
    `
    if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })

    const reviews = await sql`
      WITH ranked AS (
        SELECT
          r.id, r.rating, r.description, r.created_at, r.updated_at,
          u.id AS user_id, u.username,
          COUNT(uv.user_id)::int AS upvote_count,
          EXISTS(
            SELECT 1 FROM upvotes WHERE review_id = r.id AND user_id = ${userId}
          ) AS user_upvoted,
          EXISTS(
            SELECT 1 FROM follows WHERE follower_id = ${userId} AND following_id = r.user_id
          ) AS from_following,
          r.user_id = ${userId} AS is_own,
          ROW_NUMBER() OVER (ORDER BY COUNT(uv.user_id) DESC) AS upvote_rank
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN upvotes uv ON uv.review_id = r.id
        WHERE r.work_id = ${id}
        GROUP BY r.id, u.id, u.username
      )
      SELECT
        id, rating, description, created_at, updated_at,
        user_id, username, upvote_count, user_upvoted, from_following, is_own
      FROM ranked
      WHERE upvote_rank <= 10 OR from_following OR is_own
      ORDER BY
        is_own DESC,
        from_following DESC,
        upvote_count DESC
    `

    return res.status(200).json({ ...work, reviews })
  }

  // DELETE /api/works/:id — réservé aux administrateurs
  if (req.method === 'DELETE') {
    const me = requireAuth(req)
    const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
    if (!user?.is_admin) return res.status(403).json({ error: 'Réservé aux administrateurs' })

    const [work] = await sql`SELECT id FROM works WHERE id = ${id}`
    if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })

    await sql`DELETE FROM works WHERE id = ${id}`
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
