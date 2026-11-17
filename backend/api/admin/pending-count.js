import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
  if (!user?.is_admin) return res.status(403).json({ error: 'Interdit' })

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM works WHERE approved = false`
  return res.status(200).json({ count })
})
