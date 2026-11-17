import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const me = requireAuth(req)

  const [account] = await sql`
    SELECT id, username, email, avatar_url, bio, created_at
    FROM users
    WHERE id = ${me.userId}
  `

  const reviews = await sql`
    SELECT r.id, r.rating, r.description, r.created_at, r.updated_at,
           w.title AS work_title, w.type AS work_type, w.author AS work_author
    FROM reviews r
    JOIN works w ON w.id = r.work_id
    WHERE r.user_id = ${me.userId}
    ORDER BY r.created_at DESC
  `

  const upvotes = await sql`
    SELECT u.created_at, r.description AS review_excerpt, w.title AS work_title
    FROM upvotes u
    JOIN reviews r ON r.id = u.review_id
    JOIN works w ON w.id = r.work_id
    WHERE u.user_id = ${me.userId}
    ORDER BY u.created_at DESC
  `

  const payload = { account, reviews, upvotes, exported_at: new Date().toISOString() }

  res.setHeader('Content-Disposition', `attachment; filename="ansuz-export-${account.username}.json"`)
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json(payload)
})
