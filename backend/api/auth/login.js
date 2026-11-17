import bcrypt from 'bcryptjs'
import sql from '../../lib/db.js'
import { signToken } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'
import { setTokenCookie } from '../../lib/cookie.js'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown'
  )
}

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'email et password sont requis' })
  }

  const ip = getIp(req)

  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM login_attempts
    WHERE ip = ${ip}
      AND attempted_at > NOW() - INTERVAL '15 minutes'
  `
  if (count >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: `Trop de tentatives. Réessaie dans ${WINDOW_MINUTES} minutes.`,
    })
  }

  const [user] = await sql`
    SELECT id, username, email, password_hash, is_admin, avatar_url FROM users WHERE email = ${email} LIMIT 1
  `

  const valid = user && (await bcrypt.compare(password, user.password_hash))

  if (!valid) {
    await sql`INSERT INTO login_attempts (ip) VALUES (${ip})`
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }

  await sql`DELETE FROM login_attempts WHERE ip = ${ip}`

  const token = signToken({ userId: user.id, username: user.username })
  const { password_hash: _, ...safeUser } = user

  setTokenCookie(res, token)
  res.status(200).json({ user: safeUser, token })
})
