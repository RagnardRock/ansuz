import bcrypt from 'bcryptjs'
import sql from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { withCors } from '../../lib/cors.js'

export default withCors(async (req, res) => {
  // PUT /api/users/me — mise à jour du profil (username, email, avatar_url, password)
  if (req.method === 'PUT') {
    const me = requireAuth(req)
    const body = req.body ?? {}
    const { username, email, avatar_url, bio, current_password, new_password } = body

    // Changer email ou mot de passe requiert le mot de passe actuel
    if ((email !== undefined || new_password !== undefined) && !current_password) {
      return res.status(400).json({ error: 'Mot de passe actuel requis pour modifier l\'email ou le mot de passe' })
    }

    // Vérifier le mot de passe actuel si fourni
    if (current_password) {
      const [row] = await sql`SELECT password_hash FROM users WHERE id = ${me.userId}`
      const valid = await bcrypt.compare(current_password, row.password_hash)
      if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
    }

    // Vérifier l'unicité du username
    if (username !== undefined) {
      if (!username || username.trim().length < 2) {
        return res.status(400).json({ error: 'Le nom d\'utilisateur doit faire au moins 2 caractères' })
      }
      const [conflict] = await sql`SELECT id FROM users WHERE username = ${username} AND id != ${me.userId}`
      if (conflict) return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' })
    }

    // Vérifier l'unicité de l'email
    if (email !== undefined) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Email invalide' })
      }
      const [conflict] = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${me.userId}`
      if (conflict) return res.status(409).json({ error: 'Cet email est déjà utilisé' })
    }

    // Valider le nouveau mot de passe
    let password_hash = null
    if (new_password !== undefined) {
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })
      }
      password_hash = await bcrypt.hash(new_password, 12)
    }

    // Valider l'avatar
    if (avatar_url && !/^https?:\/\//i.test(avatar_url)) {
      return res.status(400).json({ error: 'L\'URL de l\'avatar doit commencer par http:// ou https://' })
    }

    // Valider la bio
    if (bio !== undefined && bio.length > 200) {
      return res.status(400).json({ error: 'La bio ne doit pas dépasser 200 caractères' })
    }

    // Lire les valeurs actuelles pour les champs non fournis
    const [current] = await sql`SELECT username, email, avatar_url, bio FROM users WHERE id = ${me.userId}`

    const nextUsername = username !== undefined ? username.trim() : current.username
    const nextEmail = email !== undefined ? email.trim() : current.email
    const nextAvatarUrl = 'avatar_url' in body ? (avatar_url || null) : current.avatar_url
    const nextBio = bio !== undefined ? (bio.trim() || null) : current.bio

    const [updated] = await sql`
      UPDATE users SET
        username      = ${nextUsername},
        email         = ${nextEmail},
        avatar_url    = ${nextAvatarUrl},
        bio           = ${nextBio},
        password_hash = COALESCE(${password_hash}, password_hash)
      WHERE id = ${me.userId}
      RETURNING id, username, email, avatar_url, bio, is_admin
    `
    return res.status(200).json(updated)
  }

  // DELETE /api/users/me — suppression du compte (CASCADE en DB nettoie reviews + upvotes)
  if (req.method === 'DELETE') {
    const me = requireAuth(req)
    await sql`DELETE FROM users WHERE id = ${me.userId}`
    return res.status(204).end()
  }

  res.status(405).json({ error: 'Méthode non autorisée' })
})
