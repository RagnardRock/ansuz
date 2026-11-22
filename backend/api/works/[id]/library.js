import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'

// Suivi d'une œuvre par le membre connecté : statut + progression.
//   GET    /api/works/:id/library  → mon suivi (ou null)
//   PUT    /api/works/:id/library  → crée ou met à jour { status, progress?, started_at?, finished_at? }
//   DELETE /api/works/:id/library  → retire l'œuvre de ma bibliothèque

export const STATUTS = ['planned', 'in_progress', 'completed', 'dropped']

function dateValide(v) {
  return v === null || v === undefined || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)))
}

const today = () => new Date().toISOString().slice(0, 10)

export default withCors(async (req, res) => {
  const me = requireAuth(req)
  const { id: workId } = req.query

  if (req.method === 'GET') {
    const [row] = await sql`
      SELECT status, progress, started_at::text AS started_at, finished_at::text AS finished_at, updated_at
      FROM library WHERE user_id = ${me.userId} AND work_id = ${workId}
    `
    return res.status(200).json(row ?? null)
  }

  if (req.method === 'PUT') {
    const { status, progress, started_at, finished_at } = req.body ?? {}

    if (!STATUTS.includes(status)) return res.status(400).json({ error: 'Statut invalide' })
    if (progress !== undefined && progress !== null && !(Number.isInteger(progress) && progress >= 0 && progress <= 100000)) {
      return res.status(400).json({ error: 'Progression invalide' })
    }
    if (!dateValide(started_at) || !dateValide(finished_at)) {
      return res.status(400).json({ error: 'Date invalide (format AAAA-MM-JJ)' })
    }

    const [work] = await sql`SELECT id FROM works WHERE id = ${workId}`
    if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })

    const [avant] = await sql`
      SELECT progress, started_at::text AS started_at, finished_at::text AS finished_at FROM library WHERE user_id = ${me.userId} AND work_id = ${workId}
    `

    // Dates remplies automatiquement si non fournies : début au passage « en cours », fin au passage « fini ».
    const debut = started_at !== undefined ? started_at
      : (avant?.started_at ?? (status === 'in_progress' || status === 'completed' ? today() : null))
    const fin = finished_at !== undefined ? finished_at
      : (status === 'completed' ? (avant?.finished_at ?? today()) : null)
    const prog = progress !== undefined ? progress : (avant?.progress ?? null)

    const [row] = await sql`
      INSERT INTO library (user_id, work_id, status, progress, started_at, finished_at)
      VALUES (${me.userId}, ${workId}, ${status}, ${prog}, ${debut}, ${fin})
      ON CONFLICT (user_id, work_id) DO UPDATE SET
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at
      RETURNING status, progress, started_at::text AS started_at, finished_at::text AS finished_at, updated_at
    `
    return res.status(200).json(row)
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM library WHERE user_id = ${me.userId} AND work_id = ${workId}`
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
