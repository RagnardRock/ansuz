import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))

import sql from '../lib/db.js'
import statsHandler from '../api/stats.js'
import usersHandler from '../api/users/index.js'
import userByUsernameHandler from '../api/users/[username].js'
import followingHandler from '../api/users/[username]/following.js'
import followersHandler from '../api/users/[username]/followers.js'
import workHandler from '../api/works/[id].js'
import workReviewsHandler from '../api/works/[id]/reviews.js'
import meHandler from '../api/users/me.js'

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

// ─── GET /api/stats ───────────────────────────────────────────────────────────
describe('GET /api/stats', () => {
  it('retourne 200 avec les compteurs', async () => {
    sql
      .mockResolvedValueOnce([{ works_count: 10 }])
      .mockResolvedValueOnce([{ reviews_count: 25 }])
      .mockResolvedValueOnce([{ users_count: 5 }])

    const req = makeReq()
    const res = makeRes()
    await statsHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ works_count: 10, reviews_count: 25, users_count: 5 })
  })

  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'POST' })
    const res = makeRes()
    await statsHandler(req, res)
    expect(res._status).toBe(405)
  })
})

// ─── GET /api/users ───────────────────────────────────────────────────────────
describe('GET /api/users (search)', () => {
  it('retourne 400 si la requête est trop courte (< 2 caractères)', async () => {
    const req = makeReq({ query: { q: 'a' } })
    const res = makeRes()
    await usersHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si la requête est absente', async () => {
    const req = makeReq({ query: {} })
    const res = makeRes()
    await usersHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 200 avec un tableau de résultats', async () => {
    sql.mockResolvedValueOnce([{ username: 'alice', avatar_url: null, review_count: 3 }])

    const req = makeReq({ query: { q: 'ali' } })
    const res = makeRes()
    await usersHandler(req, res)
    expect(res._status).toBe(200)
    expect(Array.isArray(res._body)).toBe(true)
  })

  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'POST', query: { q: 'ali' } })
    const res = makeRes()
    await usersHandler(req, res)
    expect(res._status).toBe(405)
  })
})

// ─── GET /api/users/:username ─────────────────────────────────────────────────
describe('GET /api/users/:username', () => {
  it('retourne 404 si l\'utilisateur n\'existe pas', async () => {
    sql.mockResolvedValueOnce([])

    const req = makeReq({ query: { username: 'fantome' } })
    const res = makeRes()
    await userByUsernameHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('retourne 200 avec le profil complet si l\'utilisateur existe', async () => {
    sql
      .mockResolvedValueOnce([{ id: 'user-id', username: 'alice', avatar_url: null, bio: null, created_at: new Date() }])
      .mockResolvedValueOnce([{ followers_count: 2 }])
      .mockResolvedValueOnce([{ following_count: 1 }])
      .mockResolvedValueOnce([])   // isFollowing
      .mockResolvedValueOnce([])   // reviews

    const req = makeReq({ query: { username: 'alice' } })
    const res = makeRes()
    await userByUsernameHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.username).toBe('alice')
    expect(Array.isArray(res._body.reviews)).toBe(true)
  })

  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'POST', query: { username: 'alice' } })
    const res = makeRes()
    await userByUsernameHandler(req, res)
    expect(res._status).toBe(405)
  })
})

// ─── GET /api/users/:username/following ───────────────────────────────────────
describe('GET /api/users/:username/following', () => {
  it('retourne 404 si l\'utilisateur n\'existe pas', async () => {
    sql.mockResolvedValueOnce([])

    const req = makeReq({ query: { username: 'fantome' } })
    const res = makeRes()
    await followingHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('retourne 200 avec un tableau', async () => {
    sql
      .mockResolvedValueOnce([{ id: 'user-id' }])
      .mockResolvedValueOnce([{ username: 'bob', avatar_url: null, is_following: false }])

    const req = makeReq({ query: { username: 'alice' } })
    const res = makeRes()
    await followingHandler(req, res)
    expect(res._status).toBe(200)
    expect(Array.isArray(res._body)).toBe(true)
  })
})

// ─── GET /api/users/:username/followers ───────────────────────────────────────
describe('GET /api/users/:username/followers', () => {
  it('retourne 404 si l\'utilisateur n\'existe pas', async () => {
    sql.mockResolvedValueOnce([])

    const req = makeReq({ query: { username: 'fantome' } })
    const res = makeRes()
    await followersHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('retourne 200 avec un tableau', async () => {
    sql
      .mockResolvedValueOnce([{ id: 'user-id' }])
      .mockResolvedValueOnce([{ username: 'bob', avatar_url: null, is_following: false }])

    const req = makeReq({ query: { username: 'alice' } })
    const res = makeRes()
    await followersHandler(req, res)
    expect(res._status).toBe(200)
    expect(Array.isArray(res._body)).toBe(true)
  })
})

// ─── GET /api/works/:id ───────────────────────────────────────────────────────
describe('GET /api/works/:id (cas succès)', () => {
  it('retourne 200 avec l\'œuvre si elle existe', async () => {
    sql.mockResolvedValueOnce([{
      id: 'work-id', title: 'Dune', type: 'book',
      cover_url: null, avg_rating: 4.5, review_count: 3,
    }])

    const req = makeReq({ query: { id: 'work-id' } })
    const res = makeRes()
    await workHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.title).toBe('Dune')
  })
})

// ─── GET /api/works/:id/reviews ───────────────────────────────────────────────
describe('GET /api/works/:id/reviews', () => {
  it('retourne 405 (seul POST est supporté)', async () => {
    const req = makeReq({ method: 'GET', query: { id: 'work-id' } })
    const res = makeRes()
    await workReviewsHandler(req, res)
    expect(res._status).toBe(405)
  })
})

// ─── GET /api/users/me ────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  it('retourne 405 (seuls PUT et DELETE sont supportés)', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await meHandler(req, res)
    expect(res._status).toBe(405)
  })
})
