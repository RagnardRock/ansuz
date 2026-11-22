<template>
  <nav class="navbar">
    <router-link :to="{ name: 'home' }" class="navbar__logo">
      <img src="/icon.svg" alt="Ansuz" class="navbar__logo-icon" />
    </router-link>

    <div class="navbar__nav">
      <router-link :to="{ name: 'home' }" class="navbar__nav-link">Accueil</router-link>
      <router-link :to="{ name: 'livres' }" class="navbar__nav-link">Livres</router-link>
      <router-link :to="{ name: 'mangas' }" class="navbar__nav-link">Mangas</router-link>
      <router-link :to="{ name: 'films' }" class="navbar__nav-link">Films</router-link>
      <router-link :to="{ name: 'series' }" class="navbar__nav-link">Séries</router-link>
      <router-link :to="{ name: 'musique' }" class="navbar__nav-link">Musique</router-link>
      <router-link :to="{ name: 'jeux' }" class="navbar__nav-link">Jeux</router-link>
      <router-link :to="{ name: 'library' }" class="navbar__nav-link">Tout</router-link>
    </div>

    <div class="navbar__right">
      <!-- Recherche utilisateurs -->
      <div ref="searchWrap" class="navbar__search-wrap">
        <button class="navbar__search-btn" aria-label="Rechercher un utilisateur" :aria-expanded="searchOpen" @click="toggleSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <Transition name="search-expand">
          <div v-if="searchOpen" class="navbar__search-panel">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="navbar__search-input"
              type="search"
              placeholder="Rechercher un utilisateur…"
              @input="onSearchInput"
              @keydown.escape="closeSearch"
            />
            <div v-if="searchResults.length > 0 || searchLoading" class="navbar__search-dropdown">
              <div v-if="searchLoading" class="search-loading">
                <span class="spinner-xs" />
              </div>
              <router-link
                v-for="user in searchResults"
                :key="user.username"
                :to="{ name: 'profile', params: { username: user.username } }"
                class="search-result"
                @click="closeSearch"
              >
                <div class="search-result__avatar">
                  <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" />
                  <span v-else>{{ user.username[0].toUpperCase() }}</span>
                </div>
                <div class="search-result__info">
                  <span class="search-result__name">{{ user.username }}</span>
                  <span class="search-result__count">{{ user.review_count }} avis</span>
                </div>
              </router-link>
              <p v-if="!searchLoading && searchResults.length === 0 && searchQuery.length >= 2" class="search-empty">
                Aucun utilisateur trouvé
              </p>
            </div>
          </div>
        </Transition>
      </div>

      <template v-if="auth.isLoggedIn">
        <router-link :to="{ name: 'profile', params: { username: auth.user.username } }" class="navbar__user">
          <img v-if="auth.user.avatar_url" :src="auth.user.avatar_url" class="navbar__avatar" :alt="auth.user.username" />
          <span v-else class="navbar__avatar navbar__avatar--initials">{{ auth.user.username[0].toUpperCase() }}</span>
          <span class="navbar__username">{{ auth.user?.username }}</span>
        </router-link>
<router-link v-if="auth.user?.is_admin" :to="{ name: 'admin' }" class="navbar__admin" aria-label="Modération">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span v-if="pendingCount > 0" class="navbar__admin-dot" />
        </router-link>
        <button class="navbar__add" aria-label="Ajouter une œuvre" title="Ajouter une œuvre (Ctrl+K)" aria-keyshortcuts="Control+K" @click="$emit('create')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button class="navbar__logout" aria-label="Se déconnecter" @click="auth.logout()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </template>

      <template v-else>
        <router-link to="/auth" class="navbar__login">Se connecter</router-link>
      </template>

      <!-- Burger — toujours en dernier -->
      <button class="navbar__burger" :class="{ open: menuOpen }" aria-label="Menu" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <span /><span /><span />
      </button>
    </div>
  </nav>

  <!-- Menu mobile (burger) -->
  <Transition name="menu-slide">
    <div v-if="menuOpen" class="mobile-menu">
      <router-link :to="{ name: 'home' }" class="mobile-link" @click="menuOpen = false">Accueil</router-link>
      <router-link :to="{ name: 'livres' }" class="mobile-link" @click="menuOpen = false">Livres</router-link>
      <router-link :to="{ name: 'mangas' }" class="mobile-link" @click="menuOpen = false">Mangas</router-link>
      <router-link :to="{ name: 'films' }" class="mobile-link" @click="menuOpen = false">Films</router-link>
      <router-link :to="{ name: 'series' }" class="mobile-link" @click="menuOpen = false">Séries</router-link>
      <router-link :to="{ name: 'musique' }" class="mobile-link" @click="menuOpen = false">Musique</router-link>
      <router-link :to="{ name: 'jeux' }" class="mobile-link" @click="menuOpen = false">Jeux</router-link>
      <router-link :to="{ name: 'library' }" class="mobile-link" @click="menuOpen = false">Tout</router-link>
      <div v-if="auth.isLoggedIn" class="mobile-menu__divider" />
      <router-link v-if="auth.user?.is_admin" :to="{ name: 'admin' }" class="mobile-link" @click="menuOpen = false">Modération</router-link>
      <button v-if="auth.isLoggedIn" class="mobile-link mobile-link--danger" @click="() => { menuOpen = false; auth.logout() }">Se déconnecter</button>
      <div class="mobile-menu__divider" />
      <router-link to="/mentions-legales" class="mobile-link mobile-link--small" @click="menuOpen = false">Mentions légales</router-link>
    </div>
  </Transition>

  <!-- Recherche mobile pleine largeur -->
  <Transition name="search-expand">
    <div v-if="searchOpen" ref="mobileSearchRef" class="mobile-search-overlay" @click.self="closeSearch">
      <input
        ref="mobileSearchInputRef"
        v-model="searchQuery"
        class="mobile-search-input"
        type="search"
        placeholder="Rechercher un utilisateur…"
        @input="onSearchInput"
        @keydown.escape="closeSearch"
      />
      <button class="mobile-search-close" @click="closeSearch">✕</button>
      <div v-if="searchResults.length > 0 || searchLoading" class="mobile-search-dropdown">
        <div v-if="searchLoading" class="search-loading"><span class="spinner-xs" /></div>
        <router-link
          v-for="user in searchResults"
          :key="user.username"
          :to="{ name: 'profile', params: { username: user.username } }"
          class="search-result"
          @click="closeSearch"
        >
          <div class="search-result__avatar">
            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" />
            <span v-else>{{ user.username[0].toUpperCase() }}</span>
          </div>
          <div class="search-result__info">
            <span class="search-result__name">{{ user.username }}</span>
            <span class="search-result__count">{{ user.review_count }} avis</span>
          </div>
        </router-link>
        <p v-if="!searchLoading && searchResults.length === 0 && searchQuery.length >= 2" class="search-empty">Aucun utilisateur trouvé</p>
      </div>
    </div>
  </Transition>

  <!-- Navbar mobile bas -->
  <nav class="mobile-bottom-nav">
    <router-link :to="{ name: 'home' }" class="mbn__item" aria-label="Accueil">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    </router-link>

    <button class="mbn__item" aria-label="Rechercher un utilisateur" @click="toggleSearch">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </button>

    <button class="mbn__item mbn__item--create" aria-label="Ajouter une œuvre" @click="$emit('create')">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <router-link
      v-if="auth.isLoggedIn"
      :to="{ name: 'profile', params: { username: auth.user.username } }"
      class="mbn__item"
      :aria-label="`Profil de ${auth.user.username}`"
    >
      <img v-if="auth.user.avatar_url" :src="auth.user.avatar_url" class="mbn__avatar" :alt="auth.user.username" />
      <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </router-link>
    <router-link v-else to="/auth" class="mbn__item" aria-label="Se connecter">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </router-link>

    <button class="mbn__item" :class="{ active: menuOpen }" aria-label="Menu" @click="menuOpen = !menuOpen">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
  </nav>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { userApi, adminApi } from '@/api/index.js'

const emit = defineEmits(['create'])
const auth = useAuthStore()

const menuOpen = ref(false)
const searchOpen = ref(false)
const pendingCount = ref(0)

async function fetchPendingCount() {
  if (!auth.user?.is_admin) return
  try {
    const { data } = await adminApi.getPendingCount()
    pendingCount.value = data.count
  } catch {
    // Compteur non critique : on ignore l'erreur.
  }
}

onMounted(fetchPendingCount)

// Ctrl+K (ou Cmd+K) : ajout rapide depuis n'importe où
function raccourciAjout(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && auth.isLoggedIn) {
    e.preventDefault()
    emit('create')
  }
}
onMounted(() => document.addEventListener('keydown', raccourciAjout))
onUnmounted(() => document.removeEventListener('keydown', raccourciAjout))
watch(() => auth.user, fetchPendingCount)
const searchQuery = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const searchInputRef = ref(null)
const mobileSearchInputRef = ref(null)
const searchWrap = ref(null)

let debounceTimer = null

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInputRef.value?.focus()
    mobileSearchInputRef.value?.focus()
    setTimeout(() => document.addEventListener('click', onClickOutside), 0)
  } else {
    closeSearch()
  }
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
  searchResults.value = []
  searchLoading.value = false
  document.removeEventListener('click', onClickOutside)
}

const mobileSearchRef = ref(null)

function onClickOutside(e) {
  const inDesktop = searchWrap.value?.contains(e.target)
  const inMobile = mobileSearchRef.value?.contains(e.target)
  if (!inDesktop && !inMobile) closeSearch()
}

function onSearchInput() {
  clearTimeout(debounceTimer)
  const q = searchQuery.value.trim()
  if (q.length < 2) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const { data } = await userApi.search(q)
      searchResults.value = data
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
}
</script>

<style scoped>
.navbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: rgba(13, 6, 0, 0.7);
  backdrop-filter: blur(10px);
}
.navbar::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-border) 20%, var(--color-border) 80%, transparent);
}
/* Burger */
.navbar__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  margin-left: 0.5rem;
}
.navbar__burger span {
  display: block;
  height: 2px;
  background: var(--color-text-muted);
  border-radius: 2px;
  transition: all 0.25s ease;
  transform-origin: center;
}
.navbar__burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.navbar__burger.open span:nth-child(2) { opacity: 0; }
.navbar__burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* Menu mobile */
.navbar__mobile-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(13, 6, 0, 0.97);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
}
.mobile-link {
  padding: 0.85rem 1.5rem;
  font-size: 0.95rem;
  color: var(--color-text-muted);
  transition: color var(--transition), background var(--transition);
}
.mobile-link:hover,
.router-link-active.mobile-link {
  color: var(--color-amber);
  background: rgba(200, 130, 26, 0.06);
}

.mobile-menu__divider {
  height: 1px;
  background: var(--color-border);
  margin: 0.25rem 0;
}
.mobile-link--danger { color: var(--color-error); text-align: left; background: transparent; width: 100%; }
.mobile-link--small { font-size: 0.78rem; opacity: 0.5; }

.menu-slide-enter-active { transition: opacity 0.2s, transform 0.2s; }
.menu-slide-leave-active { transition: opacity 0.15s, transform 0.15s; }
.menu-slide-enter-from, .menu-slide-leave-to { opacity: 0; transform: translateY(8px); }

/* Mobile search bar */
.navbar__mobile-search {
  display: none;
}

@media (max-width: 900px) {
  .navbar__burger { display: flex; }
  .navbar__search-panel { display: none; }
  .navbar__mobile-search {
    display: flex;
    align-items: center;
    position: absolute;
    inset: 0;
    z-index: 300;
    background: rgba(13, 6, 0, 0.97);
    padding: 0 1rem;
    gap: 0.5rem;
  }
  .navbar__mobile-search-input {
    flex: 1;
    padding: 0.6rem 0.9rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--color-amber);
    border-radius: 8px;
    color: var(--color-text);
    font-size: 0.9rem;
    outline: none;
  }
  .navbar__mobile-search-input::placeholder { color: var(--color-text-muted); }
  .navbar__mobile-search-close {
    color: var(--color-text-muted);
    font-size: 1rem;
    background: transparent;
    padding: 0.4rem;
    flex-shrink: 0;
  }
  .navbar__mobile-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
  }
  .navbar__logout { display: none; }
  .navbar__admin { display: none; }
}
/* ── Mobile overlays (menu + search) ── */
.mobile-menu {
  display: none;
}
.mobile-search-overlay {
  display: none;
}

/* ── Bottom mobile navbar ── */
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .navbar { display: none; }

  /* Menu burger mobile */
  .mobile-menu {
    display: flex;
    flex-direction: column;
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    z-index: 99;
    background: rgba(13, 6, 0, 0.97);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding: 0.5rem 0;
  }

  /* Recherche mobile */
  .mobile-search-overlay {
    display: flex;
    align-items: center;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 60px;
    z-index: 200;
    background: rgba(13, 6, 0, 0.97);
    padding: 1rem;
    flex-direction: column;
    gap: 0.75rem;
  }
  .mobile-search-input {
    width: 100%;
    padding: 0.7rem 1rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--color-amber);
    border-radius: 10px;
    color: var(--color-text);
    font-size: 1rem;
    outline: none;
    flex-shrink: 0;
  }
  .mobile-search-input::placeholder { color: var(--color-text-muted); }
  .mobile-search-close {
    position: absolute;
    top: 1rem; right: 1rem;
    color: var(--color-text-muted);
    font-size: 1rem;
    background: transparent;
    padding: 0.4rem;
  }
  .mobile-search-dropdown {
    width: 100%;
    overflow-y: auto;
    flex: 1;
  }

  /* Bottom navbar */
  .mobile-bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 60px;
    background: rgba(13, 6, 0, 0.96);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mbn__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition), background var(--transition);
  }
  .mbn__item:hover,
  .mbn__item.active,
  .router-link-active.mbn__item {
    color: var(--color-amber);
  }

  .mbn__item--create {
    background: var(--color-amber);
    color: #0d0600;
    border-radius: 14px;
  }
  .mbn__item--create:hover { background: var(--color-amber-lt); }

  .mbn__avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border);
  }
}
.navbar__logo {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--color-amber-lt);
  letter-spacing: 0.03em;
  font-style: italic;
  flex-shrink: 0;
}
.navbar__logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}
.navbar__nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 1.5rem;
}
.navbar__nav-link {
  font-size: 1rem;
  color: var(--color-text-muted);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  transition: color var(--transition), background var(--transition);
  white-space: nowrap;
}
.navbar__nav-link:hover { color: var(--color-text); }
.router-link-active.navbar__nav-link {
  color: var(--color-amber);
  background: rgba(200, 130, 26, 0.1);
}
@media (max-width: 900px) {
  .navbar__nav { display: none; }
}
.navbar__right {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

/* Recherche */
.navbar__search-wrap {
  position: relative;
}
.navbar__search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  transition: background var(--transition), color var(--transition);
}
.navbar__search-btn:hover {
  background: var(--color-border);
  color: var(--color-amber);
}
.navbar__search-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: 280px;
  z-index: 200;
}
.navbar__search-input {
  width: 100%;
  padding: 0.6rem 0.9rem;
  background: #1a0d02;
  border: 1px solid var(--color-amber);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.88rem;
  outline: none;
}
.navbar__search-input::placeholder { color: var(--color-text-muted); }

.navbar__search-dropdown {
  margin-top: 0.4rem;
  background: #1a0d02;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
}
.search-loading {
  display: flex;
  justify-content: center;
  padding: 0.8rem;
}
.spinner-xs {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.search-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  transition: background var(--transition);
}
.search-result:hover { background: rgba(200, 130, 26, 0.08); }
.search-result__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 130, 26, 0.12);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-amber);
}
.search-result__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.search-result__info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}
.search-result__name {
  font-size: 0.88rem;
  color: var(--color-text);
}
.search-result__count {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}
.search-empty {
  padding: 0.8rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
  text-align: center;
}

/* Transition expand */
.search-expand-enter-active { transition: opacity 0.15s, transform 0.15s; }
.search-expand-leave-active { transition: opacity 0.1s, transform 0.1s; }
.search-expand-enter-from, .search-expand-leave-to { opacity: 0; transform: translateY(-6px); }

.navbar__user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  transition: color var(--transition);
}
.navbar__user:hover { color: var(--color-text); }
.navbar__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.navbar__avatar--initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 130, 26, 0.15);
  border-color: rgba(200, 130, 26, 0.3);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-amber);
}
.navbar__username { font-size: 0.85rem; }
.navbar__login {
  font-size: 0.85rem;
  color: var(--color-amber);
  padding: 0.45rem 1rem;
  border: 1px solid var(--color-amber);
  border-radius: 8px;
  transition: background var(--transition), color var(--transition);
}
.navbar__login:hover { background: var(--color-amber); color: #0d0600; }
.navbar__admin { position: relative; }
.navbar__admin-dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 7px;
  height: 7px;
  background: var(--color-error);
  border-radius: 50%;
  border: 1.5px solid #0d0600;
}
.navbar__admin,
.navbar__add,
.navbar__logout {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  transition: background var(--transition), color var(--transition);
}
.navbar__add {
  background: var(--color-amber);
  color: #0d0600;
  padding: 0.5rem;
  border-radius: 8px;
}
.navbar__add:hover { background: var(--color-amber-lt); }
.navbar__admin:hover,
.navbar__logout:hover {
  background: var(--color-border);
  color: var(--color-amber);
}

@media (max-width: 900px) {
  .navbar__logout { display: none; }
  .navbar__admin { display: none; }
}
</style>
