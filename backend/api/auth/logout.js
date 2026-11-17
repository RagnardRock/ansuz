import { withCors } from '../../lib/cors.js'
import { clearTokenCookie } from '../../lib/cookie.js'

export default withCors(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  clearTokenCookie(res)
  res.status(204).end()
})
