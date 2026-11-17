import jwt from 'jsonwebtoken'
import { getTokenFromCookie } from './cookie.js'

const SECRET = process.env.JWT_SECRET
const EXPIRES_IN = '7d'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function requireAuth(req) {
  let token = getTokenFromCookie(req)

  // Fallback Bearer token pour les clients non-navigateur (extension)
  if (!token) {
    const auth = req.headers?.authorization
    if (auth?.startsWith('Bearer ')) token = auth.slice(7)
  }

  if (!token) throw { status: 401, message: 'Token manquant' }

  try {
    return verifyToken(token)
  } catch {
    throw { status: 401, message: 'Token invalide ou expiré' }
  }
}

export function optionalAuth(req) {
  try {
    return requireAuth(req)
  } catch {
    return null
  }
}
