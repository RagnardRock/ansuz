import { describe, it, expect } from 'vitest'
import { signToken, requireAuth, optionalAuth } from '../lib/auth.js'

function cookieReq(payload) {
  const token = signToken(payload)
  return { headers: { cookie: `token=${token}` } }
}

describe('signToken + requireAuth', () => {
  it('crée un token décodable avec le bon payload', () => {
    const req = cookieReq({ userId: 'abc', username: 'alice' })
    const payload = requireAuth(req)
    expect(payload.userId).toBe('abc')
    expect(payload.username).toBe('alice')
  })

  it('lève une erreur 401 si pas de cookie', () => {
    const req = { headers: {} }
    expect(() => requireAuth(req)).toThrowError()
    try {
      requireAuth(req)
    } catch (err) {
      expect(err.status).toBe(401)
    }
  })

  it('lève une erreur 401 si le token dans le cookie est invalide', () => {
    const req = { headers: { cookie: 'token=token.invalide.ici' } }
    try {
      requireAuth(req)
    } catch (err) {
      expect(err.status).toBe(401)
    }
  })

  it('lève une erreur 401 si le cookie ne contient pas de token', () => {
    const req = { headers: { cookie: 'autre_cookie=valeur' } }
    try {
      requireAuth(req)
    } catch (err) {
      expect(err.status).toBe(401)
    }
  })
})

describe('optionalAuth', () => {
  it('retourne null si pas de cookie', () => {
    const req = { headers: {} }
    expect(optionalAuth(req)).toBeNull()
  })

  it('retourne le payload si le cookie est valide', () => {
    const req = cookieReq({ userId: 'xyz', username: 'bob' })
    expect(optionalAuth(req)?.userId).toBe('xyz')
  })

  it("retourne null si le token est invalide (sans lever d'erreur)", () => {
    const req = { headers: { cookie: 'token=invalide' } }
    expect(optionalAuth(req)).toBeNull()
  })
})

describe('requireAuth — Bearer token (extension)', () => {
  function bearerReq(payload) {
    const token = signToken(payload)
    return { headers: { authorization: `Bearer ${token}` } }
  }

  it('accepte un Bearer token valide', () => {
    const req = bearerReq({ userId: 'ext-user', username: 'alice' })
    const payload = requireAuth(req)
    expect(payload.userId).toBe('ext-user')
    expect(payload.username).toBe('alice')
  })

  it('lève 401 si le Bearer token est invalide', () => {
    const req = { headers: { authorization: 'Bearer token.invalide.ici' } }
    try {
      requireAuth(req)
    } catch (err) {
      expect(err.status).toBe(401)
    }
  })

  it('lève 401 si Authorization ne commence pas par Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } }
    try {
      requireAuth(req)
    } catch (err) {
      expect(err.status).toBe(401)
    }
  })

  it('préfère le cookie sur le Bearer si les deux sont présents', () => {
    const cookiePayload = { userId: 'cookie-user', username: 'from-cookie' }
    const bearerPayload = { userId: 'bearer-user', username: 'from-bearer' }
    const token = signToken(cookiePayload)
    const req = {
      headers: {
        cookie: `token=${token}`,
        authorization: `Bearer ${signToken(bearerPayload)}`,
      },
    }
    const payload = requireAuth(req)
    expect(payload.userId).toBe('cookie-user')
  })
})
