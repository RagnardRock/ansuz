import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))

import sql from '../lib/db.js'
import followHandler from '../api/users/[username]/follow.js'
import feedHandler from '../api/feed.js'
import followingWorksHandler from '../api/following-works.js'

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

// ─── POST /api/users/:username/follow ─────────────────────────────────────────
describe('POST /api/users/:username/follow', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'POST', query: { username: 'bob' } })
    const res = makeRes()
    await followHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 404 si l\'utilisateur cible n\'existe pas', async () => {
    sql.mockResolvedValueOnce([]) // user introuvable

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
      query: { username: 'fantome' },
    })
    const res = makeRes()
    await followHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('retourne 400 si on essaie de se suivre soi-même', async () => {
    sql.mockResolvedValueOnce([{ id: 'alice-id' }]) // target = soi-même

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
      query: { username: 'alice' },
    })
    const res = makeRes()
    await followHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne { following: true } si on ne suivait pas encore', async () => {
    sql
      .mockResolvedValueOnce([{ id: 'bob-id' }])  // target trouvé
      .mockResolvedValueOnce([])                   // pas encore abonné
      // INSERT résolu par le mock par défaut

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
      query: { username: 'bob' },
    })
    const res = makeRes()
    await followHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.following).toBe(true)
  })

  it('retourne { following: false } si on suivait déjà (désabonnement)', async () => {
    sql
      .mockResolvedValueOnce([{ id: 'bob-id' }])  // target trouvé
      .mockResolvedValueOnce([{ 1: 1 }])           // déjà abonné
      // DELETE résolu par le mock par défaut

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
      query: { username: 'bob' },
    })
    const res = makeRes()
    await followHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.following).toBe(false)
  })
})

// ─── GET /api/feed ────────────────────────────────────────────────────────────
describe('GET /api/feed', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await feedHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 200 avec un tableau (même vide) si authentifié', async () => {
    const req = makeReq({
      method: 'GET',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
    })
    const res = makeRes()
    await feedHandler(req, res)
    expect(res._status).toBe(200)
    expect(Array.isArray(res._body)).toBe(true)
  })
})

// ─── GET /api/following-works ─────────────────────────────────────────────────
describe('GET /api/following-works', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await followingWorksHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 200 avec un tableau d\'ids si authentifié', async () => {
    sql.mockResolvedValueOnce([{ work_id: 1 }, { work_id: 2 }])

    const req = makeReq({
      method: 'GET',
      headers: authHeader({ userId: 'alice-id', username: 'alice' }),
    })
    const res = makeRes()
    await followingWorksHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual([1, 2])
  })
})
