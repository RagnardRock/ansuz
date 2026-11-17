import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  const { id } = req.query

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  if (me.userId === id) return res.status(400).json({ error: 'Impossible de supprimer son propre compte depuis l\'administration' })

  const [admin] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
  if (!admin?.is_admin) return res.status(403).json({ error: 'Réservé aux administrateurs' })

  const [user] = await sql`SELECT id FROM users WHERE id = ${id}`
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  await sql`DELETE FROM users WHERE id = ${id}`
  return res.status(204).end()
})
