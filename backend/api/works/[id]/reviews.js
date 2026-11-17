import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const { id: workId } = req.query

  const [work] = await sql`SELECT id FROM works WHERE id = ${workId}`
  if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })

  // Un utilisateur ne peut avoir qu'un seul avis par œuvre (contrainte UNIQUE en DB)
  const [existing] = await sql`
    SELECT id FROM reviews WHERE work_id = ${workId} AND user_id = ${me.userId}
  `
  if (existing) return res.status(409).json({ error: 'Vous avez déjà un avis sur cette œuvre' })

  const { rating, description } = req.body ?? {}

  if (rating !== undefined && (rating < 0.5 || rating > 5 || !Number.isInteger(rating * 2))) {
    return res.status(400).json({ error: 'La note doit être entre 0.5 et 5 (multiples de 0.5)' })
  }

  const [{ id: reviewId }] = await sql`
    INSERT INTO reviews (work_id, user_id, rating, description)
    VALUES (${workId}, ${me.userId}, ${rating ?? null}, ${description ?? null})
    RETURNING id
  `

  const [review] = await sql`
    SELECT
      r.id, r.rating, r.description, r.created_at, r.updated_at,
      u.id AS user_id, u.username,
      0::int AS upvote_count,
      false AS user_upvoted
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.id = ${reviewId}
  `
  return res.status(201).json(review)
})
