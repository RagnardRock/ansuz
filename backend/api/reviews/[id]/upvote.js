import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const { id: reviewId } = req.query

  const [review] = await sql`SELECT user_id FROM reviews WHERE id = ${reviewId}`
  if (!review) return res.status(404).json({ error: 'Review introuvable' })
  if (review.user_id === me.userId) return res.status(403).json({ error: 'Impossible de voter pour sa propre review' })

  const [existing] = await sql`
    SELECT 1 FROM upvotes WHERE review_id = ${reviewId} AND user_id = ${me.userId}
  `

  if (existing) {
    await sql`DELETE FROM upvotes WHERE review_id = ${reviewId} AND user_id = ${me.userId}`
  } else {
    await sql`INSERT INTO upvotes (review_id, user_id) VALUES (${reviewId}, ${me.userId})`
  }

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM upvotes WHERE review_id = ${reviewId}
  `

  return res.status(200).json({ upvoted: !existing, upvote_count: count })
})
