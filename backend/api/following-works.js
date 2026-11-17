import sql from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { withCors } from '../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)

  const rows = await sql`
    SELECT DISTINCT r.work_id
    FROM follows f
    JOIN reviews r ON r.user_id = f.following_id
    WHERE f.follower_id = ${me.userId}
  `

  return res.status(200).json(rows.map((r) => r.work_id))
})
