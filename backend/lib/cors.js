const PRIMARY_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:5173'

const ALLOWED_ORIGINS = new Set([
  PRIMARY_ORIGIN,
  PRIMARY_ORIGIN.replace('https://www.', 'https://'),
  PRIMARY_ORIGIN.replace('https://', 'https://www.'),
])

export function setCorsHeaders(res, req) {
  const origin = req?.headers?.origin
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : PRIMARY_ORIGIN
  res.setHeader('Access-Control-Allow-Origin', allowed)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export function withCors(handler) {
  return async (req, res) => {
    setCorsHeaders(res, req)

    if (req.method === 'OPTIONS') return res.status(200).end()

    try {
      await handler(req, res)
    } catch (err) {
      const status = err.status ?? 500
      const message = err.message ?? 'Erreur serveur'
      res.status(status).json({ error: message })
    }
  }
}
