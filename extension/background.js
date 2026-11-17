const API = 'https://ansuz.media/api'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }))
  return true
})

async function handleMessage(msg) {
  if (msg.action === 'login') {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: msg.email, password: msg.password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    return data
  }

  if (msg.action === 'createWork') {
    const { action, token, ...payload } = msg
    const res = await fetch(`${API}/works`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error, status: res.status }
    return data
  }

  if (msg.action === 'searchCovers') {
    const params = new URLSearchParams({ q: msg.q })
    if (msg.type) params.set('type', msg.type)
    const res = await fetch(`${API}/search/covers?${params}`)
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    return { results: data }
  }

  return { error: 'Action inconnue' }
}
