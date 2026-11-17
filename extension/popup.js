let token = null
let username = null
let currentRating = 0
let coverDebounce = null
let selectedMeta = {}   // métadonnées CDN de la couverture sélectionnée

// ── Vues ───────────────────────────────────────────────────────────

function show(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.getElementById(id).classList.add('active')
}

function showError(id, msg) {
  const el = document.getElementById(id)
  el.textContent = msg
  el.style.display = 'block'
}

function hideError(id) {
  const el = document.getElementById(id)
  el.textContent = ''
  el.style.display = 'none'
}

function setLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId)
  btn.disabled = loading
  btn.innerHTML = loading ? '<span class="spinner"></span>' : label
}

// ── Labels auteur par type ─────────────────────────────────────────

const AUTHOR_LABELS = {
  book: 'Auteur', manga: 'Mangaka', film: 'Réalisateur·ice',
  series: 'Créateur·ice', music: 'Artiste / Groupe', game: 'Studio',
}

const CDN_LABELS = {
  googlebooks: 'Google Books', anilist: 'AniList',
  tmdb: 'TMDB', itunes: 'iTunes', rawg: 'RAWG',
}

function updateAuthorLabel(type) {
  document.getElementById('author-label').textContent = AUTHOR_LABELS[type] ?? 'Auteur'
}

// ── Type pills ─────────────────────────────────────────────────────

document.querySelectorAll('.type-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-pill').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById('type').value = btn.dataset.type
    updateAuthorLabel(btn.dataset.type)
    const q = document.getElementById('title').value.trim()
    if (q.length >= 2) searchCovers(q)
  })
})

// ── Étoiles ────────────────────────────────────────────────────────

function renderStars(val) {
  for (let i = 1; i <= 5; i++) {
    const fg = document.getElementById(`sf-${i}`)
    if (!fg) continue
    if (val >= i)             fg.style.width = '100%'
    else if (val >= i - 0.5) fg.style.width = '50%'
    else                      fg.style.width = '0%'
  }
  const label = document.getElementById('star-label')
  if (label) label.textContent = val ? `${val}/5` : ''
}

document.querySelectorAll('.half-zone').forEach(btn => {
  const v = Number(btn.dataset.v)
  btn.addEventListener('mouseenter', () => renderStars(v))
  btn.addEventListener('mouseleave', () => renderStars(currentRating))
  btn.addEventListener('click', () => {
    currentRating = currentRating === v ? 0 : v
    document.getElementById('rating').value = currentRating || ''
    renderStars(currentRating)
  })
})

// ── Init ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['token', 'username'])
  token    = stored.token    ?? null
  username = stored.username ?? null

  if (token) {
    await openPostForm()
  } else {
    show('view-login')
  }
})

async function openPostForm() {
  show('view-form')
  document.getElementById('username-display').textContent = username

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  document.getElementById('title').value       = ''
  document.getElementById('link').value        = tab.url ?? ''
  document.getElementById('description').value = ''
  document.getElementById('author').value      = ''
  document.getElementById('cover_url').value   = ''
  document.getElementById('covers-section').style.display = 'none'
  document.getElementById('covers-track').innerHTML = ''
  document.getElementById('cdn-badge').style.display = 'none'
  updateAuthorLabel('book')
  selectedMeta = {}
  // Reset type
  document.querySelectorAll('.type-pill').forEach(b => b.classList.remove('active'))
  document.querySelector('.type-pill[data-type="book"]').classList.add('active')
  document.getElementById('type').value = 'book'
  currentRating = 0
  document.getElementById('rating').value = ''
  renderStars(0)
  hideError('post-error')
}

// ── Recherche couvertures ──────────────────────────────────────────

document.getElementById('title').addEventListener('input', () => {
  clearTimeout(coverDebounce)
  const q = document.getElementById('title').value.trim()
  if (q.length < 2) {
    document.getElementById('covers-section').style.display = 'none'
    return
  }
  coverDebounce = setTimeout(() => searchCovers(q), 700)
})

async function searchCovers(q) {
  const section = document.getElementById('covers-section')
  const loading = document.getElementById('covers-loading')
  const track   = document.getElementById('covers-track')
  const type    = document.getElementById('type').value

  section.style.display = 'block'
  loading.style.display = 'block'
  track.innerHTML = ''
  document.getElementById('cover_url').value = ''

  const response = await chrome.runtime.sendMessage({ action: 'searchCovers', q, type })
  loading.style.display = 'none'

  if (response.error || !response.results?.length) return

  response.results.forEach(item => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'cover-item'
    btn.title = item.title
    const img = document.createElement('img')
    img.src = item.image
    img.alt = item.title
    img.onerror = () => { btn.style.display = 'none' }
    btn.appendChild(img)
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cover-item').forEach(c => c.classList.remove('selected'))
      const already = document.getElementById('cover_url').value === item.image
      if (already) {
        document.getElementById('cover_url').value = ''
        document.getElementById('cdn-badge').style.display = 'none'
        selectedMeta = {}
      } else {
        btn.classList.add('selected')
        document.getElementById('cover_url').value = item.image
        // Capture métadonnées CDN
        selectedMeta = { cdn_source: item.source, ...(item.metadata ?? {}) }
        // Pré-remplir l'auteur
        if (item.author) document.getElementById('author').value = item.author
        // Badge CDN
        const badge = document.getElementById('cdn-badge')
        badge.textContent = `✓ Infos importées depuis ${CDN_LABELS[item.source] ?? item.source}`
        badge.style.display = 'block'
      }
    })
    track.appendChild(btn)
  })
}

// ── Connexion ──────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError('login-error')
  setLoading('login-btn', true, 'Se connecter')

  const response = await chrome.runtime.sendMessage({
    action:   'login',
    email:    document.getElementById('email').value,
    password: document.getElementById('password').value,
  })

  if (response.error) {
    showError('login-error', response.error)
    setLoading('login-btn', false, 'Se connecter')
    return
  }

  token    = response.token
  username = response.user.username
  await chrome.storage.local.set({ token, username })
  await openPostForm()
})

// ── Déconnexion ────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'username'])
  token = null; username = null
  show('view-login')
})

// ── Publication ────────────────────────────────────────────────────

document.getElementById('post-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError('post-error')
  setLoading('post-btn', true, 'Publier')

  const link      = document.getElementById('link').value
  const rating    = document.getElementById('rating').value
  const cover_url = document.getElementById('cover_url').value
  const type      = document.getElementById('type').value

  const { description: synopsisFromMeta, ...metaPayload } = selectedMeta

  const response = await chrome.runtime.sendMessage({
    action:      'createWork',
    token,
    title:       document.getElementById('title').value,
    type,
    author:      document.getElementById('author').value || undefined,
    link:        link      || undefined,
    description: document.getElementById('description').value || undefined,
    synopsis:    synopsisFromMeta || undefined,
    rating:      rating    ? Number(rating) : undefined,
    cover_url:   cover_url || undefined,
    ...metaPayload,
  })

  if (response.error) {
    if (response.status === 401) {
      await chrome.storage.local.remove(['token', 'username'])
      show('view-login')
      return
    }
    showError('post-error', response.error)
    setLoading('post-btn', false, 'Publier')
    return
  }

  show('view-success')
})

// ── Succès ─────────────────────────────────────────────────────────

document.getElementById('add-another-btn').addEventListener('click', openPostForm)
