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

  const library = await sql`
    SELECT l.status, l.progress, l.started_at::text AS started_at, l.finished_at::text AS finished_at,
           l.updated_at, w.title AS work_title, w.type AS work_type
    FROM library l
    JOIN works w ON w.id = l.work_id
    WHERE l.user_id = ${me.userId}
    ORDER BY l.updated_at DESC
  `

  const replies = await sql`
    SELECT rr.body, rr.created_at, w.title AS work_title, au.username AS review_author
    FROM review_replies rr
    JOIN reviews r ON r.id = rr.review_id
    JOIN works w ON w.id = r.work_id
    JOIN users au ON au.id = r.user_id
    WHERE rr.user_id = ${me.userId}
    ORDER BY rr.created_at DESC
  `

  const payload = { account, reviews, upvotes, library, replies, exported_at: new Date().toISOString() }

  res.setHeader('Content-Disposition', `attachment; filename="ansuz-export-${account.username}.json"`)
  res.setHeader('Content-Type', 'application/json')
  return res.status(200).json(payload)
})
