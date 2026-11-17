import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

import sql from '../lib/db.js'
import bcrypt from 'bcryptjs'
import registerHandler from '../api/auth/register.js'
import loginHandler from '../api/auth/login.js'
import logoutHandler from '../api/auth/logout.js'

function makeReq({ method = 'POST', headers = {}, body = {}, query = {} } = {}) {
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

beforeEach(() => {
  sql.mockReset()
  sql.mockResolvedValue([])
  vi.mocked(bcrypt.hash).mockResolvedValue('$2b$12$hashed')
  vi.mocked(bcrypt.compare).mockResolvedValue(true)
})

// ─── POST /api/auth/register ──────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(405)
  })

  it('retourne 400 si des champs sont manquants', async () => {
    const req = makeReq({ body: { username: 'alice', email: 'alice@example.com' } })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 400 si le mot de passe est trop court', async () => {
    const req = makeReq({ body: { username: 'alice', email: 'alice@example.com', password: 'court' } })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 409 si email ou username est déjà pris', async () => {
    sql.mockResolvedValueOnce([{ id: '1' }]) // conflit
    const req = makeReq({ body: { username: 'alice', email: 'alice@example.com', password: 'motdepasse123' } })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(409)
  })

  it('retourne 201 avec les infos utilisateur (happy path)', async () => {
    sql
      .mockResolvedValueOnce([])  // pas de conflit
      .mockResolvedValueOnce([{ id: '1', username: 'alice', email: 'alice@example.com', created_at: new Date() }])

    const req = makeReq({ body: { username: 'alice', email: 'alice@example.com', password: 'motdepasse123' } })
    const res = makeRes()
    await registerHandler(req, res)
    expect(res._status).toBe(201)
    expect(res._body.user.username).toBe('alice')
    expect(res._body.user.password_hash).toBeUndefined()
  })
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(405)
  })

  it('retourne 400 si email ou password sont manquants', async () => {
    const req = makeReq({ body: { email: 'alice@example.com' } })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 429 si trop de tentatives depuis la même IP', async () => {
    sql.mockResolvedValueOnce([{ count: 5 }]) // >= MAX_ATTEMPTS
    const req = makeReq({ body: { email: 'alice@example.com', password: 'motdepasse123' } })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(429)
  })

  it('retourne 401 si les identifiants sont incorrects', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false)
    sql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ id: '1', username: 'alice', email: 'alice@example.com', password_hash: '$hash', is_admin: false }])

    const req = makeReq({ body: { email: 'alice@example.com', password: 'mauvaismdp' } })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 401 si le compte n\'existe pas', async () => {
    sql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])  // user introuvable

    const req = makeReq({ body: { email: 'inexistant@example.com', password: 'motdepasse123' } })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(401)
  })

  it('retourne 200 avec les infos utilisateur sans password_hash (happy path)', async () => {
    sql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ id: '1', username: 'alice', email: 'alice@example.com', password_hash: '$hash', is_admin: false }])

    const req = makeReq({ body: { email: 'alice@example.com', password: 'motdepasse123' } })
    const res = makeRes()
    await loginHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.user.username).toBe('alice')
    expect(res._body.user.password_hash).toBeUndefined()
    expect(res._body.user.is_admin).toBe(false)
  })
})

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('retourne 204 (même sans authentification)', async () => {
    const req = makeReq()
    const res = makeRes()
    await logoutHandler(req, res)
    expect(res._status).toBe(204)
  })
})
