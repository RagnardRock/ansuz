import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

// DELETE /api/replies/:id — l'auteur de la réponse ou un administrateur
export default withCors(async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const { id } = req.query

  const [reply] = await sql`SELECT user_id FROM review_replies WHERE id = ${id}`
  if (!reply) return res.status(404).json({ error: 'Réponse introuvable' })

  if (reply.user_id !== me.userId) {
    const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
    if (!user?.is_admin) return res.status(403).json({ error: 'Interdit' })
  }

  await sql`DELETE FROM review_replies WHERE id = ${id}`
  return res.status(204).end()
})
