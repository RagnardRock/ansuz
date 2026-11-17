import bcrypt from 'bcryptjs'
import sql from '../../lib/db.js'
import { signToken } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'
import { setTokenCookie } from '../../lib/cookie.js'

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { username, email, password } = req.body ?? {}

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email et password sont requis' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })
  }

  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} OR username = ${username} LIMIT 1
  `
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email ou username déjà utilisé' })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const [user] = await sql`
    INSERT INTO users (username, email, password_hash)
    VALUES (${username}, ${email}, ${password_hash})
    RETURNING id, username, email, created_at
  `

  const token = signToken({ userId: user.id, username: user.username })

  setTokenCookie(res, token)
  res.status(201).json({ user })
})
