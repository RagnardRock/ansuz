import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

// Réponses sous un avis.
//   GET  /api/reviews/:id/replies → les réponses, de la plus ancienne à la plus récente
//   POST /api/reviews/:id/replies → { body } ajoute une réponse (connecté)

export const LONGUEUR_MAX = 2000

export default withCors(async (req, res) => {
  const { id: reviewId } = req.query

  if (req.method === 'GET') {
    const replies = await sql`
      SELECT rr.id, rr.body, rr.created_at, u.id AS user_id, u.username
      FROM review_replies rr
      JOIN users u ON u.id = rr.user_id
      WHERE rr.review_id = ${reviewId}
      ORDER BY rr.created_at ASC
      LIMIT 200
    `
    return res.status(200).json(replies)
  }

  if (req.method === 'POST') {
    const me = requireAuth(req)
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (!body) return res.status(400).json({ error: 'La réponse est vide' })
    if (body.length > LONGUEUR_MAX) return res.status(400).json({ error: `${LONGUEUR_MAX} caractères au maximum` })

    const [review] = await sql`SELECT id FROM reviews WHERE id = ${reviewId}`
    if (!review) return res.status(404).json({ error: 'Avis introuvable' })

    const [reply] = await sql`
      WITH nouvelle AS (
        INSERT INTO review_replies (review_id, user_id, body)
        VALUES (${reviewId}, ${me.userId}, ${body})
        RETURNING id, body, created_at, user_id
      )
      SELECT n.id, n.body, n.created_at, u.id AS user_id, u.username
      FROM nouvelle n JOIN users u ON u.id = n.user_id
    `
    return res.status(201).json(reply)
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
