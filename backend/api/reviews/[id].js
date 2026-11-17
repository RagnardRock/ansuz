import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  const { id } = req.query

  // PUT /api/reviews/:id — modifier son propre avis
  if (req.method === 'PUT') {
    const me = requireAuth(req)
    const [review] = await sql`SELECT user_id FROM reviews WHERE id = ${id}`
    if (!review) return res.status(404).json({ error: 'Avis introuvable' })
    if (review.user_id !== me.userId) return res.status(403).json({ error: 'Interdit' })

    const { rating, description } = req.body ?? {}

    if (rating !== undefined && (rating < 0.5 || rating > 5 || !Number.isInteger(rating * 2))) {
      return res.status(400).json({ error: 'La note doit être entre 0.5 et 5 (multiples de 0.5)' })
    }

    await sql`
      UPDATE reviews SET
        rating      = COALESCE(${rating ?? null}, rating),
        description = COALESCE(${description ?? null}, description)
      WHERE id = ${id}
    `
    const [updated] = await sql`
      SELECT
        r.id, r.rating, r.description, r.created_at, r.updated_at,
        u.id AS user_id, u.username,
        COUNT(uv.user_id)::int AS upvote_count,
        EXISTS(
          SELECT 1 FROM upvotes WHERE review_id = r.id AND user_id = ${me.userId}
        ) AS user_upvoted
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN upvotes uv ON uv.review_id = r.id
      WHERE r.id = ${id}
      GROUP BY r.id, u.id, u.username
    `
    return res.status(200).json(updated)
  }

  // DELETE /api/reviews/:id — propriétaire de l'avis ou administrateur
  if (req.method === 'DELETE') {
    const me = requireAuth(req)
    const [review] = await sql`SELECT user_id FROM reviews WHERE id = ${id}`
    if (!review) return res.status(404).json({ error: 'Avis introuvable' })

    const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
    if (review.user_id !== me.userId && !user?.is_admin) {
      return res.status(403).json({ error: 'Interdit' })
    }

    await sql`DELETE FROM reviews WHERE id = ${id}`
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
