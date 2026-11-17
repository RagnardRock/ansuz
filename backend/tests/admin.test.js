import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))

import sql from '../lib/db.js'
import adminUsersHandler from '../api/admin/users.js'
import adminUserByIdHandler from '../api/admin/users/[id].js'

function makeReq({ method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  return { method, headers, body, query }
}

function makeRes() {
  return {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this },
    json(body) { this._body = body; return this },
    end() { return this },
    setHeader() { return this },
  }
}

function authHeader(payload) {
  return { cookie: `token=${signToken(payload)}` }
}

beforeEach(() => {
  sql.mockReset()
  sql.mockResolvedValue([])
})

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq()
    const res = makeRes()
    await adminUsersHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 403 si l\'utilisateur n\'est pas administrateur', async () => {
    sql.mockResolvedValueOnce([{ is_admin: false }])

    const req = makeReq({
      headers: authHeader({ userId: 'user-id', username: 'alice' }),
    })
    const res = makeRes()
    await adminUsersHandler(req, res)
    expect(res._status).toBe(403)
  })

  it('retourne 200 avec la liste des utilisateurs si admin', async () => {
    sql
      .mockResolvedValueOnce([{ is_admin: true }])
      .mockResolvedValueOnce([
        { id: '1', username: 'alice', email: 'alice@example.com', is_admin: true, review_count: 5 },
        { id: '2', username: 'bob', email: 'bob@example.com', is_admin: false, review_count: 2 },
      ])

    const req = makeReq({
      headers: authHeader({ userId: 'admin-id', username: 'admin' }),
    })
    const res = makeRes()
    await adminUsersHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body).toHaveLength(2)
  })
})

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
describe('DELETE /api/admin/users/:id', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'DELETE', query: { id: 'target-id' } })
    const res = makeRes()
    await adminUserByIdHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 400 si l\'admin essaie de supprimer son propre compte', async () => {
    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'admin-id', username: 'admin' }),
      query: { id: 'admin-id' },
    })
    const res = makeRes()
    await adminUserByIdHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 403 si l\'utilisateur n\'est pas administrateur', async () => {
    sql.mockResolvedValueOnce([{ is_admin: false }])

    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'user-id', username: 'alice' }),
      query: { id: 'target-id' },
    })
    const res = makeRes()
    await adminUserByIdHandler(req, res)
    expect(res._status).toBe(403)
  })

  it('retourne 404 si l\'utilisateur cible n\'existe pas', async () => {
    sql
      .mockResolvedValueOnce([{ is_admin: true }])
      .mockResolvedValueOnce([])  // user introuvable

    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'admin-id', username: 'admin' }),
      query: { id: 'fantome-id' },
    })
    const res = makeRes()
    await adminUserByIdHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('retourne 204 si la suppression réussit', async () => {
    sql
      .mockResolvedValueOnce([{ is_admin: true }])
      .mockResolvedValueOnce([{ id: 'target-id' }])  // user trouvé
      // DELETE résolu par le mock par défaut

    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'admin-id', username: 'admin' }),
      query: { id: 'target-id' },
    })
    const res = makeRes()
    await adminUserByIdHandler(req, res)
    expect(res._status).toBe(204)
  })
})
