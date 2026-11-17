const isProd = process.env.FRONTEND_URL?.startsWith('https')
const MAX_AGE = 7 * 24 * 60 * 60 // 7 jours en secondes

function buildCookie(value, maxAge) {
  return [
    `token=${value}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    isProd ? 'SameSite=None' : 'SameSite=Lax',
    isProd ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function setTokenCookie(res, token) {
  res.setHeader('Set-Cookie', buildCookie(token, MAX_AGE))
}

export function clearTokenCookie(res) {
  res.setHeader('Set-Cookie', buildCookie('', 0))
}

export function getTokenFromCookie(req) {
  const cookieHeader = req.headers['cookie'] ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
  return match?.[1] ?? null
}
