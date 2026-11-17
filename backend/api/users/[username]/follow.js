import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)
  const { username } = req.query

  const [target] = await sql`SELECT id FROM users WHERE username = ${username}`
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })
  if (target.id === me.userId) return res.status(400).json({ error: 'Impossible de se suivre soi-même' })

  const [existing] = await sql`
    SELECT 1 FROM follows WHERE follower_id = ${me.userId} AND following_id = ${target.id}
  `

  if (existing) {
    await sql`DELETE FROM follows WHERE follower_id = ${me.userId} AND following_id = ${target.id}`
    return res.status(200).json({ following: false })
  } else {
    await sql`INSERT INTO follows (follower_id, following_id) VALUES (${me.userId}, ${target.id})`
    return res.status(200).json({ following: true })
  }
})
