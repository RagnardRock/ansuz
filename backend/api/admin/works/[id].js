import sql from '../../../lib/db.js'
import { requireAuth } from '../../../lib/auth.js'
import { withCors } from '../../../lib/cors.js'
import { nettoyerTexte } from '../../../lib/texte.js'

async function requireAdmin(req, res) {
  const me = requireAuth(req)
  const [user] = await sql`SELECT is_admin FROM users WHERE id = ${me.userId}`
  if (!user?.is_admin) { res.status(403).json({ error: 'Réservé aux administrateurs' }); return null }
  return me
}

export default withCors(async (req, res) => {
  const { id } = req.query

  // PATCH /api/admin/works/:id — approuver ou rejeter
  if (req.method === 'PATCH') {
    const me = await requireAdmin(req, res)
    if (!me) return

    const { approved } = req.body ?? {}
    if (typeof approved !== 'boolean') return res.status(400).json({ error: 'Champ approved requis (boolean)' })

    if (!approved) {
      await sql`DELETE FROM works WHERE id = ${id}`
      return res.status(204).end()
    }

    const [work] = await sql`UPDATE works SET approved = true WHERE id = ${id} RETURNING id`
    if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })
    return res.status(200).json(work)
  }

  // PUT /api/admin/works/:id — modifier tous les champs
  if (req.method === 'PUT') {
    const me = await requireAdmin(req, res)
    if (!me) return

    const {
      title, author, type, cover_url, link, cdn_source,
      description, release_year, genres, page_count, publisher, isbn, language,
      status, volume_count, origin, duration, main_cast, season_count,
      platforms, track_count,
    } = req.body ?? {}

    const [work] = await sql`
      UPDATE works SET
        title         = COALESCE(${title ?? null}, title),
        author        = ${author ?? null},
        type          = COALESCE(${type ?? null}, type),
        cover_url     = ${cover_url ?? null},
        link          = ${link ?? null},
        cdn_source    = ${cdn_source ?? null},
        description   = ${nettoyerTexte(description)},
        release_year  = ${release_year ?? null},
        genres        = ${genres ?? null},
        page_count    = ${page_count ?? null},
        publisher     = ${publisher ?? null},
        isbn          = ${isbn ?? null},
        language      = ${language ?? null},
        status        = ${status ?? null},
        volume_count  = ${volume_count ?? null},
        origin        = ${origin ?? null},
        duration      = ${duration ?? null},
        main_cast     = ${main_cast ?? null},
        season_count  = ${season_count ?? null},
        platforms     = ${platforms ?? null},
        track_count   = ${track_count ?? null}
      WHERE id = ${id}
      RETURNING id, title, author, type, cover_url, approved
    `
    if (!work) return res.status(404).json({ error: 'Œuvre introuvable' })
    return res.status(200).json(work)
  }

  // DELETE /api/admin/works/:id — supprimer
  if (req.method === 'DELETE') {
    const me = await requireAdmin(req, res)
    if (!me) return
    await sql`DELETE FROM works WHERE id = ${id}`
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
