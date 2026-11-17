import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({
  default: vi.fn().mockResolvedValue([]),
}))

import sql from '../lib/db.js'
import worksHandler from '../api/works/index.js'
import workHandler from '../api/works/[id].js'
import workReviewsHandler from '../api/works/[id]/reviews.js'
import reviewHandler from '../api/reviews/[id].js'
import upvoteHandler from '../api/reviews/[id]/upvote.js'
import userHandler from '../api/users/me.js'

function makeReq({ method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  return { method, headers, body, query }
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    status(code) {
      this._status = code
      return this
    },
    json(body) {
      this._body = body
      return this
    },
    end() {
      return this
    },
    setHeader() {
      return this
    },
  }
  return res
}

function authHeader(payload) {
  return { cookie: `token=${signToken(payload)}` }
}

beforeEach(() => {
  sql.mockResolvedValue([])
})

// ─── GET /api/works ────────────────────────────────────────────────────────
describe('GET /api/works', () => {
  it('est accessible sans authentification (200)', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(200)
  })
})

// ─── POST /api/works ───────────────────────────────────────────────────────
describe('POST /api/works', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'POST', body: { title: 'Test' } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 429 si le rate limit est atteint', async () => {
    // La DB indique que l'utilisateur a déjà créé 100 œuvres cette heure
    sql.mockResolvedValueOnce([{ count: 100 }])

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'user-id', username: 'alice' }),
      body: { title: 'Encore un livre' },
    })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(429)
  })
})

// ─── GET /api/works/:id ────────────────────────────────────────────────────
describe('GET /api/works/:id', () => {
  it("retourne 404 si l'œuvre n'existe pas", async () => {
    sql.mockResolvedValueOnce([]) // work introuvable

    const req = makeReq({ method: 'GET', query: { id: 'unknown-id' } })
    const res = makeRes()
    await workHandler(req, res)
    expect(res._status).toBe(404)
  })
})

// ─── DELETE /api/works/:id ─────────────────────────────────────────────────
describe('DELETE /api/works/:id', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'DELETE', query: { id: 'some-id' } })
    const res = makeRes()
    await workHandler(req, res)
    expect(res._status).toBe(401)
  })

  it("retourne 403 si l'utilisateur n'est pas administrateur", async () => {
    // La DB retourne un utilisateur non-admin
    sql.mockResolvedValueOnce([{ is_admin: false }])

    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'user-id', username: 'alice' }),
      query: { id: 'some-id' },
    })
    const res = makeRes()
    await workHandler(req, res)
    expect(res._status).toBe(403)
  })
})

// ─── POST /api/works/:id/reviews ───────────────────────────────────────────
describe('POST /api/works/:id/reviews', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'POST', query: { id: 'some-id' } })
    const res = makeRes()
    await workReviewsHandler(req, res)
    expect(res._status).toBe(401)
  })

  it("retourne 409 si l'utilisateur a déjà un avis sur cette œuvre", async () => {
    // 1er appel : l'œuvre existe, 2e appel : un avis existe déjà
    sql.mockResolvedValueOnce([{ id: 'work-id' }]).mockResolvedValueOnce([{ id: 'review-id' }])

    const req = makeReq({
      method: 'POST',
      headers: authHeader({ userId: 'user-id', username: 'alice' }),
      query: { id: 'work-id' },
      body: { rating: 4, description: 'Super' },
    })
    const res = makeRes()
    await workReviewsHandler(req, res)
    expect(res._status).toBe(409)
  })
})

// ─── PUT /api/reviews/:id ─────────────────────────────────────────────────
describe('PUT /api/reviews/:id', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'PUT', query: { id: 'some-id' } })
    const res = makeRes()
    await reviewHandler(req, res)
    expect(res._status).toBe(401)
  })

  it("retourne 403 si l'utilisateur n'est pas propriétaire de l'avis", async () => {
    sql.mockResolvedValueOnce([{ user_id: 'owner-id' }])

    const req = makeReq({
      method: 'PUT',
      headers: authHeader({ userId: 'attacker-id', username: 'attacker' }),
      query: { id: 'some-id' },
      body: { rating: 1 },
    })
    const res = makeRes()
    await reviewHandler(req, res)
    expect(res._status).toBe(403)
  })
})

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────
describe('DELETE /api/reviews/:id', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'DELETE', query: { id: 'some-id' } })
    const res = makeRes()
    await reviewHandler(req, res)
    expect(res._status).toBe(401)
  })

  it("retourne 403 si l'utilisateur n'est ni propriétaire ni admin", async () => {
    // 1er appel : l'avis appartient à 'owner-id', 2e appel : l'utilisateur n'est pas admin
    sql
      .mockResolvedValueOnce([{ user_id: 'owner-id' }])
      .mockResolvedValueOnce([{ is_admin: false }])

    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'attacker-id', username: 'attacker' }),
      query: { id: 'some-id' },
    })
    const res = makeRes()
    await reviewHandler(req, res)
    expect(res._status).toBe(403)
  })
})

// ─── POST /api/reviews/:id/upvote ─────────────────────────────────────────
describe('POST /api/reviews/:id/upvote', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'POST', query: { id: 'some-id' } })
    const res = makeRes()
    await upvoteHandler(req, res)
    expect(res._status).toBe(401)
  })
})

// ─── DELETE /api/users/me ─────────────────────────────────────────────────
describe('DELETE /api/users/me', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'DELETE' })
    const res = makeRes()
    await userHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('supprime le compte et retourne 204 si authentifié', async () => {
    const req = makeReq({
      method: 'DELETE',
      headers: authHeader({ userId: 'user-123', username: 'alice' }),
    })
    const res = makeRes()
    await userHandler(req, res)
    expect(res._status).toBe(204)
  })
})

// ─── PUT /api/users/me ────────────────────────────────────────────────────
describe('PUT /api/users/me', () => {
  it('retourne 401 sans token', async () => {
    const req = makeReq({ method: 'PUT', body: { avatar_url: 'https://example.com/avatar.jpg' } })
    const res = makeRes()
    await userHandler(req, res)
    expect(res._status).toBe(401)
  })
})
