import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

import sql from '../lib/db.js'
import worksHandler from '../api/works/index.js'
import workReviewsHandler from '../api/works/[id]/reviews.js'
import reviewHandler from '../api/reviews/[id].js'
import meHandler from '../api/users/me.js'
import registerHandler from '../api/auth/register.js'

function makeReq({ method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  return { method, headers, body, query }
}
function makeRes() {
  return {
    _status: 200, _body: null,
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

// ─── Validation du rating ──────────────────────────────────────────────────────
describe('Validation du rating — POST /api/works', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  beforeEach(() => {
    sql.mockResolvedValueOnce([{ count: 0 }]) // rate limit ok
  })

  it('retourne 400 si rating = 0 (en dessous du minimum)', async () => {
    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', rating: 0 } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si rating = 5.5 (au dessus du maximum)', async () => {
    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', rating: 5.5 } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si rating = 1.3 (pas un multiple de 0.5)', async () => {
    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', rating: 1.3 } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('accepte rating = 0.5 (minimum valide)', async () => {
    sql.mockResolvedValueOnce([{ id: 'work-id' }])   // INSERT work
    sql.mockResolvedValueOnce([])                      // INSERT review
    sql.mockResolvedValueOnce([{ id: 'work-id', title: 'Test', type: 'book', avg_rating: 0.5, review_count: 1 }])

    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', rating: 0.5 } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(201)
  })

  it('accepte rating = 2.5 (demi-étoile valide)', async () => {
    sql.mockResolvedValueOnce([{ id: 'work-id' }])
    sql.mockResolvedValueOnce([])
    sql.mockResolvedValueOnce([{ id: 'work-id', title: 'Test', type: 'book', avg_rating: 2.5, review_count: 1 }])

    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', rating: 2.5 } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(201)
  })
})

describe('Validation du rating — POST /api/works/:id/reviews', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  it('retourne 400 si rating = 6', async () => {
    sql.mockResolvedValueOnce([{ id: 'work-id' }])
    sql.mockResolvedValueOnce([])

    const req = makeReq({ method: 'POST', ...auth, query: { id: 'work-id' }, body: { rating: 6 } })
    const res = makeRes()
    await workReviewsHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si rating = 0', async () => {
    sql.mockResolvedValueOnce([{ id: 'work-id' }])
    sql.mockResolvedValueOnce([])

    const req = makeReq({ method: 'POST', ...auth, query: { id: 'work-id' }, body: { rating: 0 } })
    const res = makeRes()
    await workReviewsHandler(req, res)
    expect(res._status).toBe(400)
  })
})

describe('Validation du rating — PUT /api/reviews/:id', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  it('retourne 400 si rating invalide', async () => {
    sql.mockResolvedValueOnce([{ user_id: 'user-id' }])

    const req = makeReq({ method: 'PUT', ...auth, query: { id: 'review-id' }, body: { rating: 99 } })
    const res = makeRes()
    await reviewHandler(req, res)
    expect(res._status).toBe(400)
  })
})

// ─── Validation du lien (POST /api/works) ─────────────────────────────────────
describe('Validation du lien — POST /api/works', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  it('retourne 400 si le lien ne commence pas par http(s)://', async () => {
    sql.mockResolvedValueOnce([{ count: 0 }])

    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', link: 'ftp://invalid.com' } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si le lien est un chemin relatif', async () => {
    sql.mockResolvedValueOnce([{ count: 0 }])

    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', link: '/chemin/relatif' } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })
})

// ─── Validation du type (POST /api/works) ─────────────────────────────────────
describe('Validation du type — POST /api/works', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  it('retourne 400 si le type est inconnu', async () => {
    sql.mockResolvedValueOnce([{ count: 0 }])

    const req = makeReq({ method: 'POST', ...auth, body: { title: 'Test', type: 'podcast' } })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(400)
  })
})

// ─── Validation de la bio et de l'avatar (PUT /api/users/me) ─────────────────
describe('Validation du profil — PUT /api/users/me', () => {
  const auth = { headers: authHeader({ userId: 'user-id', username: 'alice' }) }

  it('retourne 400 si la bio dépasse 200 caractères', async () => {
    const req = makeReq({
      method: 'PUT', ...auth,
      body: { bio: 'a'.repeat(201) },
    })
    const res = makeRes()
    await meHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si l\'avatar_url n\'est pas une URL valide', async () => {
    const req = makeReq({
      method: 'PUT', ...auth,
      body: { avatar_url: 'pas-une-url' },
    })
    const res = makeRes()
    await meHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si le username est trop court (< 2 caractères)', async () => {
    sql.mockResolvedValueOnce([]) // pas de conflict
    const req = makeReq({
      method: 'PUT', ...auth,
      body: { username: 'a' },
    })
    const res = makeRes()
    await meHandler(req, res)
    expect(res._status).toBe(400)
  })
})

// ─── Token invalide / malformé ────────────────────────────────────────────────
describe('Sécurité JWT', () => {
  it('retourne 401 avec un token malformé (pas un JWT)', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { cookie: 'token=pasunejwt' },
      body: { title: 'Test' },
    })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 401 avec un JWT dont la signature est invalide', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJoYWNrZXIifQ.invalidsignature'
    const req = makeReq({
      method: 'POST',
      headers: { cookie: `token=${fakeToken}` },
      body: { title: 'Test' },
    })
    const res = makeRes()
    await worksHandler(req, res)
    expect(res._status).toBe(401)
  })
})

// ─── Mass assignment (POST /api/auth/register) ────────────────────────────────
describe('Mass assignment — POST /api/auth/register', () => {
  it('ignore le champ is_admin dans le body', async () => {
    sql
      .mockResolvedValueOnce([])  // pas de conflit
      .mockResolvedValueOnce([{ id: '1', username: 'alice', email: 'alice@example.com', created_at: new Date() }])

    const req = makeReq({
      method: 'POST',
      body: { username: 'alice', email: 'alice@example.com', password: 'motdepasse123', is_admin: true },
    })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(201)
    // is_admin ne doit pas apparaître dans la réponse (non sélectionné) ou être false
    expect(res._body.user.is_admin).toBeUndefined()
  })
})
