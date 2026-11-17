import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/db.js', () => ({ default: vi.fn() }))

import sql from '../lib/db.js'
import randomHandler from '../api/works/random.js'

function makeReq({ method = 'GET', query = {} } = {}) {
  return { method, query }
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

const fakeWork = {
  id: 'work-1', title: 'Dune', author: 'Frank Herbert',
  type: 'book', cover_url: null, avg_rating: 4.5, review_count: 3,
}

beforeEach(() => {
  sql.mockReset()
})

describe('GET /api/works/random', () => {
  it('retourne 200 avec une œuvre aléatoire', async () => {
    sql.mockResolvedValueOnce([fakeWork])
    const req = makeReq()
    const res = makeRes()
    await randomHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.title).toBe('Dune')
  })

  it('retourne 404 si aucune œuvre trouvée', async () => {
    sql.mockResolvedValueOnce([])
    const req = makeReq()
    const res = makeRes()
    await randomHandler(req, res)
    expect(res._status).toBe(404)
  })

  it('filtre par types si le paramètre est fourni', async () => {
    sql.mockResolvedValueOnce([{ ...fakeWork, type: 'film' }])
    const req = makeReq({ query: { types: 'film,series' } })
    const res = makeRes()
    await randomHandler(req, res)
    expect(res._status).toBe(200)
    expect(res._body.type).toBe('film')
  })

  it('retourne 400 si tous les types fournis sont invalides', async () => {
    const req = makeReq({ query: { types: 'invalid,unknown' } })
    const res = makeRes()
    await randomHandler(req, res)
    expect(res._status).toBe(400)
  })

  it('retourne 405 pour une méthode non autorisée', async () => {
    const req = makeReq({ method: 'POST' })
    const res = makeRes()
    await randomHandler(req, res)
    expect(res._status).toBe(405)
  })
})
