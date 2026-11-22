import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({
  default: vi.fn().mockResolvedValue([]),
}))

import sql from '../lib/db.js'
import workLibraryHandler from '../api/works/[id]/library.js'
import userLibraryHandler from '../api/users/[username]/library.js'

const USER = { userId: '11111111-1111-1111-1111-111111111111', username: 'ragna' }
const WORK = '22222222-2222-2222-2222-222222222222'

function makeReq({ method = 'GET', auth = true, body = {}, query = {} } = {}) {
  const headers = auth ? { cookie: `token=${signToken(USER)}` } : {}
  return { method, headers, body, query }
}

function makeRes() {
  return {
    _status: 200, _body: null,
    status(c) { this._status = c; return this },
    json(b) { this._body = b; return this },
    end() { return this },
    setHeader() { return this },
  }
}

// Valeurs passées à l'appel sql (gabarit étiqueté) numéro n
const valeurs = (n) => sql.mock.calls[n].slice(1)

beforeEach(() => {
  sql.mockReset()
  sql.mockResolvedValue([])
})

describe('/api/works/:id/library', () => {
  it('refuse sans connexion (401)', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ auth: false, query: { id: WORK } }), res)
    expect(res._status).toBe(401)
  })

  it('GET renvoie null si l\'œuvre n\'est pas suivie', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ query: { id: WORK } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toBeNull()
  })

  it('PUT refuse un statut inconnu (400)', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'lu' } }), res)
    expect(res._status).toBe(400)
    expect(sql).not.toHaveBeenCalled()
  })

  it('PUT refuse une progression négative ou non entière (400)', async () => {
    for (const progress of [-1, 2.5, '3']) {
      const res = makeRes()
      await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'in_progress', progress } }), res)
      expect(res._status).toBe(400)
    }
  })

  it('PUT refuse une date mal formée (400)', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'completed', finished_at: '22/11/2026' } }), res)
    expect(res._status).toBe(400)
  })

  it('PUT renvoie 404 si l\'œuvre n\'existe pas', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'planned' } }), res)
    expect(res._status).toBe(404)
  })

  it('PUT « fini » remplit le début et la fin avec la date du jour', async () => {
    const today = new Date().toISOString().slice(0, 10)
    sql
      .mockResolvedValueOnce([{ id: WORK }]) // l'œuvre existe
      .mockResolvedValueOnce([])             // pas de suivi avant
      .mockResolvedValueOnce([{ status: 'completed' }])
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'completed' } }), res)
    expect(res._status).toBe(200)
    // user, work, status, progress, début, fin
    expect(valeurs(2)).toEqual([USER.userId, WORK, 'completed', null, today, today])
  })

  it('PUT garde la progression et la date de début déjà enregistrées', async () => {
    sql
      .mockResolvedValueOnce([{ id: WORK }])
      .mockResolvedValueOnce([{ progress: 8, started_at: '2026-01-02', finished_at: null }])
      .mockResolvedValueOnce([{ status: 'dropped' }])
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'dropped' } }), res)
    expect(valeurs(2)).toEqual([USER.userId, WORK, 'dropped', 8, '2026-01-02', null])
  })

  it('PUT « à lire » ne met aucune date', async () => {
    sql.mockResolvedValueOnce([{ id: WORK }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{}])
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'PUT', query: { id: WORK }, body: { status: 'planned' } }), res)
    expect(valeurs(2)).toEqual([USER.userId, WORK, 'planned', null, null, null])
  })

  it('DELETE répond 204', async () => {
    const res = makeRes()
    await workLibraryHandler(makeReq({ method: 'DELETE', query: { id: WORK } }), res)
    expect(res._status).toBe(204)
  })
})

describe('/api/users/:username/library', () => {
  it('refuse un filtre de statut inconnu (400)', async () => {
    const res = makeRes()
    await userLibraryHandler(makeReq({ auth: false, query: { username: 'ragna', status: 'nimporte' } }), res)
    expect(res._status).toBe(400)
  })

  it('renvoie 404 pour un membre inconnu', async () => {
    const res = makeRes()
    await userLibraryHandler(makeReq({ auth: false, query: { username: 'personne' } }), res)
    expect(res._status).toBe(404)
  })
})
