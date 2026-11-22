import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken } from '../lib/auth.js'

vi.mock('../lib/db.js', () => ({
  default: vi.fn().mockResolvedValue([]),
}))

import sql from '../lib/db.js'
import repliesHandler from '../api/reviews/[id]/replies.js'
import replyHandler from '../api/replies/[id].js'

const USER = { userId: '11111111-1111-1111-1111-111111111111', username: 'ragna' }
const AUTRE = '33333333-3333-3333-3333-333333333333'
const REVIEW = '22222222-2222-2222-2222-222222222222'

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

beforeEach(() => {
  sql.mockReset()
  sql.mockResolvedValue([])
})

describe('/api/reviews/:id/replies', () => {
  it('GET est public', async () => {
    sql.mockResolvedValueOnce([{ id: 'a', body: 'Pareil !' }])
    const res = makeRes()
    await repliesHandler(makeReq({ auth: false, query: { id: REVIEW } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toHaveLength(1)
  })

  it('POST refuse sans connexion (401)', async () => {
    const res = makeRes()
    await repliesHandler(makeReq({ method: 'POST', auth: false, query: { id: REVIEW }, body: { body: 'Salut' } }), res)
    expect(res._status).toBe(401)
  })

  it('POST refuse une réponse vide ou trop longue (400)', async () => {
    for (const body of ['', '   ', 'x'.repeat(2001), 42]) {
      const res = makeRes()
      await repliesHandler(makeReq({ method: 'POST', query: { id: REVIEW }, body: { body } }), res)
      expect(res._status).toBe(400)
    }
    expect(sql).not.toHaveBeenCalled()
  })

  it('POST renvoie 404 si l\'avis n\'existe pas', async () => {
    const res = makeRes()
    await repliesHandler(makeReq({ method: 'POST', query: { id: REVIEW }, body: { body: 'Salut' } }), res)
    expect(res._status).toBe(404)
  })

  it('POST enregistre le texte sans espaces autour (201)', async () => {
    sql.mockResolvedValueOnce([{ id: REVIEW }]).mockResolvedValueOnce([{ id: 'r1', body: 'Salut' }])
    const res = makeRes()
    await repliesHandler(makeReq({ method: 'POST', query: { id: REVIEW }, body: { body: '  Salut  ' } }), res)
    expect(res._status).toBe(201)
    expect(sql.mock.calls[1].slice(1)).toEqual([REVIEW, USER.userId, 'Salut'])
  })
})

describe('DELETE /api/replies/:id', () => {
  it('l\'auteur peut supprimer sa réponse (204)', async () => {
    sql.mockResolvedValueOnce([{ user_id: USER.userId }])
    const res = makeRes()
    await replyHandler(makeReq({ method: 'DELETE', query: { id: 'r1' } }), res)
    expect(res._status).toBe(204)
  })

  it('un autre membre ne peut pas (403)', async () => {
    sql.mockResolvedValueOnce([{ user_id: AUTRE }]).mockResolvedValueOnce([{ is_admin: false }])
    const res = makeRes()
    await replyHandler(makeReq({ method: 'DELETE', query: { id: 'r1' } }), res)
    expect(res._status).toBe(403)
  })

  it('un administrateur peut (204)', async () => {
    sql.mockResolvedValueOnce([{ user_id: AUTRE }]).mockResolvedValueOnce([{ is_admin: true }])
    const res = makeRes()
    await replyHandler(makeReq({ method: 'DELETE', query: { id: 'r1' } }), res)
    expect(res._status).toBe(204)
  })

  it('404 si la réponse n\'existe pas', async () => {
    const res = makeRes()
    await replyHandler(makeReq({ method: 'DELETE', query: { id: 'r1' } }), res)
    expect(res._status).toBe(404)
  })
})
