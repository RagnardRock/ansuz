import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

async function requireAdmin(req, res) {
  const me = requireAuth(req)
  const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
  if (!user?.is_admin) { res.status(403).json({ error: 'Réservé aux administrateurs' }); return null }
  return me
}

export default withCors(async (req, res) => {
  // GET /api/admin/works — œuvres en attente d'approbation
  if (req.method === 'GET') {
    const me = await requireAdmin(req, res)
    if (!me) return

    const works = await sql`
      SELECT
        w.id, w.title, w.author, w.type, w.cover_url, w.approved, w.cdn_source, w.created_at,
        w.description, w.release_year, w.genres, w.page_count, w.publisher, w.isbn, w.language,
        w.status, w.volume_count, w.origin, w.duration, w.main_cast, w.season_count,
        w.platforms, w.track_count, w.link,
        u.username AS created_by_username
      FROM works w
      LEFT JOIN users u ON u.id = w.created_by
      WHERE w.approved = false
      ORDER BY w.created_at ASC
    `
    return res.status(200).json(works)
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
