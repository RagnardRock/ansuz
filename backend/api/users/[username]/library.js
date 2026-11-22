import sql from '../../../lib/db.js'
import { withCors } from '../../../lib/cors.js'
import { STATUTS } from '../../works/[id]/library.js'

// GET /api/users/:username/library?status=in_progress
// Bibliothèque publique d'un membre : œuvres avec statut et progression, plus le nombre par statut.
export default withCors(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { username, status } = req.query
  if (status && !STATUTS.includes(status)) return res.status(400).json({ error: 'Statut invalide' })

  const [user] = await sql`SELECT id FROM users WHERE username = ${username}`
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const works = await sql`
    SELECT
      w.id, w.title, w.author, w.type, w.cover_url, w.release_year,
      w.page_count, w.volume_count, w.season_count,
      l.status, l.progress, l.started_at::text AS started_at, l.finished_at::text AS finished_at, l.updated_at
    FROM library l
    JOIN works w ON w.id = l.work_id
    WHERE l.user_id = ${user.id}
      AND (${status ?? null}::text IS NULL OR l.status = ${status ?? null})
    ORDER BY l.updated_at DESC
    LIMIT 500
  `

  const compte = await sql`
    SELECT status, COUNT(*)::int AS n FROM library WHERE user_id = ${user.id} GROUP BY status
  `
  const counts = Object.fromEntries(STATUTS.map((s) => [s, 0]))
  for (const { status: s, n } of compte) counts[s] = n

  return res.status(200).json({ works, counts })
})
