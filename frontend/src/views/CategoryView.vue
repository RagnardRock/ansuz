<template>
  <div class="category-page">
    <Navbar @create="openCreate()" />

    <main class="category-main">
      <!-- En-tête -->
      <div class="category-header">
        <div class="category-header__left">
          <router-link to="/" class="category-back">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </router-link>
          <h1 class="category-title">{{ pageTitle }}</h1>
          <span class="category-count">{{ totalWorks }}</span>
          <button v-if="auth.isLoggedIn && currentType" class="create-type-btn" :title="`Ajouter un${currentType === 'music' ? 'e' : ''} ${pageTitle.toLowerCase().replace('jeux vidéo', 'jeu')}`" @click="openCreate(currentType)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div class="category-header__right">
          <button
            v-if="auth.isLoggedIn"
            class="filter-btn"
            :class="{ 'filter-btn--active': filterFollowing }"
            @click="toggleFollowing"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Suivi
          </button>
          <div class="user-filter-wrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="user-filter-icon">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              v-model="userFilterQuery"
              class="user-filter-input"
              type="text"
              placeholder="Par utilisateur…"
              @input="onUserFilterInput"
            />
            <span v-if="userFilterLoading" class="filter-spinner" />
          </div>
          <div class="search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchText"
              class="search-input"
              type="search"
              placeholder="Rechercher…"
            />
          </div>
          <select v-model="sortBy" class="sort-select">
            <option value="date-desc">Récent</option>
            <option value="date-asc">Ancien</option>
            <option value="rating">Mieux noté</option>
            <option value="reviews">Plus d'avis</option>
            <option value="alpha">A → Z</option>
          </select>
          <button v-if="currentType" class="filter-btn" :class="{ 'filter-btn--active': activeFilterCount > 0 }" @click="showFilterPanel = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
            Filtres<span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
          <button v-if="hasFilters" class="reset-btn" @click="resetFilters">✕</button>
        </div>
      </div>

      <!-- Onglets catégories (si on est sur /bibliotheque) -->
      <div v-if="!currentType" class="type-tabs">
        <router-link v-for="t in TYPES" :key="t.value" :to="t.to" class="type-tab">{{ t.label }}</router-link>
      </div>

      <!-- Grille -->
      <div v-if="loading" class="category-status">
        <span class="spinner" />
      </div>

      <div v-else-if="works.length === 0" class="category-empty">
        <p class="category-empty__text">
          {{ hasFilters ? 'Aucun résultat.' : 'Aucune œuvre pour l\'instant.' }}
        </p>
        <button v-if="auth.isLoggedIn && !hasFilters" class="btn-amber" @click="openCreate(currentType)">
          + Ajouter une œuvre
        </button>
        <router-link v-else-if="!auth.isLoggedIn && !hasFilters" to="/auth" class="btn-amber">
          Se connecter pour contribuer
        </router-link>
      </div>

      <div v-else class="works-grid">
        <Book
          v-for="work in works"
          :key="work.id"
          :work="work"
          @open="openWork"
        />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1 || works.length > 0" class="pagination">
        <div class="pagination__controls">
          <button class="pagination__btn" :disabled="currentPage <= 1" @click="goToPage(1)">«</button>
          <button class="pagination__btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
          <template v-for="p in paginationRange" :key="p">
            <span v-if="p === '...'" class="pagination__ellipsis">…</span>
            <button v-else class="pagination__btn" :class="{ 'pagination__btn--active': p === currentPage }" @click="goToPage(p)">{{ p }}</button>
          </template>
          <button class="pagination__btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">›</button>
          <button class="pagination__btn" :disabled="currentPage >= totalPages" @click="goToPage(totalPages)">»</button>
        </div>
        <div class="pagination__meta">
          <span class="pagination__info">{{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, totalWorks) }} sur {{ totalWorks }}</span>
          <select v-model="perPage" class="pagination__per-page">
            <option v-for="n in PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }} / page</option>
          </select>
        </div>
      </div>
    </main>

    <!-- BookDetail modal -->
    <Teleport to="body">
      <Transition name="modal">
        <BookDetail
          v-if="selectedWork"
          :work="selectedWork"
          @close="selectedWork = null"
          @work-deleted="onWorkDeleted"
        />
      </Transition>
    </Teleport>

    <!-- CreateWork modal -->
    <Teleport to="body">
      <Transition name="modal">
        <CreateWorkModal
          v-if="showCreate"
          :initial-type="createInitialType"
          @close="showCreate = false; createInitialType = null"
          @created="onWorkCreated"
          @open-work="(work) => { showCreate = false; createInitialType = null; selectedWork = work }"
        />
      </Transition>
    </Teleport>

    <!-- FilterPanel -->
    <FilterPanel
      v-model="showFilterPanel"
      :facets="facets"
      :filters="filters"
      @update:filters="onAdvancedFiltersUpdate"
      @reset="resetAdvancedFilters"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { worksApi, userApi } from '@/api/index.js'
import Navbar from '@/components/Navbar.vue'
import Book from '@/components/Book.vue'
import BookDetail from '@/components/BookDetail.vue'
import CreateWorkModal from '@/components/CreateWorkModal.vue'
import FilterPanel from '@/components/FilterPanel.vue'

const route = useRoute()
const auth = useAuthStore()

// ─── Works (local, server-filtered) ──────────────────────────────────────────
const works = ref([])
const loading = ref(false)
const totalWorks = ref(0)
const totalPages = ref(1)

const PER_PAGE_OPTIONS = [12, 24, 48]
const storedPerPage = parseInt(localStorage.getItem('perPage')) || 24
const perPage = ref(PER_PAGE_OPTIONS.includes(storedPerPage) ? storedPerPage : 24)
const currentPage = ref(1)

watch(perPage, (val) => {
  localStorage.setItem('perPage', val)
  currentPage.value = 1
  fetchWorks()
})

// ─── Navigation ───────────────────────────────────────────────────────────────
const selectedWork = ref(null)
const showCreate = ref(false)
const createInitialType = ref(null)

function openCreate(type = null) {
  createInitialType.value = type
  showCreate.value = true
}
function openWork(work) { selectedWork.value = work }
function onWorkCreated() { showCreate.value = false; createInitialType.value = null; fetchWorks() }
function onWorkDeleted() { selectedWork.value = null; fetchWorks() }

// ─── Route helpers ────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'book',   label: 'Livres',   to: '/livres' },
  { value: 'manga',  label: 'Mangas',   to: '/mangas' },
  { value: 'film',   label: 'Films',    to: '/films' },
  { value: 'series', label: 'Séries',   to: '/series' },
  { value: 'music',  label: 'Musique',  to: '/musique' },
  { value: 'game',   label: 'Jeux',     to: '/jeux' },
]
const TYPE_TITLES = {
  library: 'Bibliothèque', livres: 'Livres', mangas: 'Mangas',
  films: 'Films', series: 'Séries', musique: 'Musique', jeux: 'Jeux vidéo',
}
const ROUTE_TO_TYPE = {
  livres: 'book', mangas: 'manga', films: 'film',
  series: 'series', musique: 'music', jeux: 'game',
}
const currentType = computed(() => ROUTE_TO_TYPE[route.name] ?? null)
const pageTitle = computed(() => TYPE_TITLES[route.name] ?? 'Bibliothèque')

// ─── Search input focus ───────────────────────────────────────────────────────
const searchInputRef = ref(null)
watch(() => route.query.focus, (val) => {
  if (val === 'search') {
    const stop = watch(searchInputRef, (el) => { if (el) { el.focus(); stop() } }, { immediate: true })
  }
}, { immediate: true })

// ─── Filtres ──────────────────────────────────────────────────────────────────
const searchText = ref('')
const sortBy = ref('date-desc')
const filterFollowing = ref(false)
const userFilterQuery = ref('')
const userFilterLoading = ref(false)
const activeUserFilter = ref(null)
const showFilterPanel = ref(false)

const filters = ref({
  genres: null, yearFrom: null, yearTo: null, minRating: null,
  language: null, status: null, origin: null, platforms: null,
})
const activeFilterCount = computed(() =>
  Object.values(filters.value).filter((v) => v !== null && (!Array.isArray(v) || v.length > 0)).length
)

const paginationRange = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// ─── Facettes ─────────────────────────────────────────────────────────────────
const facets = ref({ genres: [], year_range: {}, languages: [], statuses: [], origins: [], platforms: [] })

watch(currentType, async (type) => {
  try {
    const { data } = await worksApi.getFilters(type)
    facets.value = data
    if (filters.value.genres?.length) {
      filters.value = { ...filters.value, genres: filters.value.genres.filter((g) => data.genres.includes(g)) || null }
    }
  } catch {
    facets.value = { genres: [], year_range: {}, languages: [], statuses: [], origins: [], platforms: [] }
  }
}, { immediate: true })

// ─── hasFilters ───────────────────────────────────────────────────────────────
const hasFilters = computed(() =>
  searchText.value.trim() ||
  sortBy.value !== 'date-desc' ||
  filterFollowing.value ||
  activeUserFilter.value ||
  activeFilterCount.value > 0
)

// ─── Fetch works ──────────────────────────────────────────────────────────────
let fetchTimer = null
function scheduleFetch() {
  clearTimeout(fetchTimer)
  fetchTimer = setTimeout(fetchWorks, 300)
}

async function fetchWorks() {
  loading.value = true
  const f = filters.value
  const params = {
    sort: sortBy.value,
    page: currentPage.value,
    per_page: perPage.value,
    ...(currentType.value && { type: currentType.value }),
    ...(searchText.value.trim() && { search: searchText.value.trim() }),
    ...(f.genres?.length && { genres: f.genres.join(',') }),
    ...(f.yearFrom && { year_from: f.yearFrom }),
    ...(f.yearTo && { year_to: f.yearTo }),
    ...(f.minRating && { min_rating: f.minRating }),
    ...(filterFollowing.value && { following: 'true' }),
    ...(activeUserFilter.value && { user: activeUserFilter.value }),
    ...(f.language && { language: f.language }),
    ...(f.status && { status: f.status }),
    ...(f.origin && { origin: f.origin }),
    ...(f.platforms?.length && { platforms: f.platforms.join(',') }),
  }
  try {
    const { data } = await worksApi.getAll(params)
    works.value = data.works
    totalWorks.value = data.total
    totalPages.value = data.total_pages
  } catch {
    works.value = []
    totalWorks.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

function goToPage(p) {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value))
  fetchWorks()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Watchers qui déclenchent le fetch
watch(currentType, () => { resetFilters(); fetchWorks() })
watch([searchText, sortBy], () => { currentPage.value = 1; scheduleFetch() })
watch([filterFollowing, activeUserFilter, filters], () => { currentPage.value = 1; fetchWorks() }, { deep: true })

// ─── Actions filtres ──────────────────────────────────────────────────────────
function toggleFollowing() {
  filterFollowing.value = !filterFollowing.value
  userFilterQuery.value = ''
  activeUserFilter.value = null
}

let userFilterTimer = null
function onUserFilterInput() {
  clearTimeout(userFilterTimer)
  const q = userFilterQuery.value.trim()
  if (!q) { activeUserFilter.value = null; filterFollowing.value = false; return }
  filterFollowing.value = false
  userFilterLoading.value = true
  userFilterTimer = setTimeout(async () => {
    try {
      const { data: users } = await userApi.search(q)
      if (!users.length) { activeUserFilter.value = null; return }
      const match = users.find((u) => u.username.toLowerCase() === q.toLowerCase()) ?? users[0]
      activeUserFilter.value = match.username
    } catch {
      activeUserFilter.value = null
    } finally {
      userFilterLoading.value = false
    }
  }, 400)
}

function onAdvancedFiltersUpdate(val) { filters.value = val }

function resetAdvancedFilters() {
  filters.value = { genres: null, yearFrom: null, yearTo: null, minRating: null, language: null, status: null, origin: null, platforms: null }
}

function resetFilters() {
  searchText.value = ''
  sortBy.value = 'date-desc'
  filterFollowing.value = false
  userFilterQuery.value = ''
  activeUserFilter.value = null
  resetAdvancedFilters()
}

// Fetch initial
fetchWorks()
</script>

<style scoped>
.category-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.category-main {
  flex: 1;
  padding: 1.75rem 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* En-tête */
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.category-header__left { display: flex; align-items: center; gap: 0.75rem; }
.category-back {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 6px;
  color: var(--color-text-muted); border: 1px solid var(--color-border);
  transition: color var(--transition), border-color var(--transition); flex-shrink: 0;
}
.category-back:hover { color: var(--color-amber); border-color: rgba(200, 130, 26, 0.4); }
.category-title {
  font-family: var(--font-serif); font-size: 1.5rem;
  color: var(--color-amber-lt); font-weight: 400; font-style: italic;
}
.create-type-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--color-amber); color: #0d0600;
  flex-shrink: 0; transition: background var(--transition);
}
.create-type-btn:hover { background: var(--color-amber-lt); }
.category-count {
  font-size: 0.78rem; color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--color-border);
  border-radius: 20px; padding: 0.15rem 0.6rem;
}
.category-header__right { display: flex; align-items: center; gap: 0.6rem; }

.filter-btn {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 7px; color: var(--color-text-muted); font-size: 0.82rem;
  cursor: pointer; transition: border-color var(--transition), color var(--transition), background var(--transition);
  white-space: nowrap; flex-shrink: 0;
}
.filter-btn:hover { border-color: rgba(200, 130, 26, 0.4); color: var(--color-amber); }
.filter-btn--active { border-color: var(--color-amber); color: var(--color-amber); background: rgba(200, 130, 26, 0.08); }
.filter-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px;
  background: var(--color-amber); color: #0d0600;
  border-radius: 10px; font-size: 0.65rem; font-weight: 700;
}

.user-filter-wrap { position: relative; display: flex; align-items: center; }
.user-filter-icon { position: absolute; left: 0.6rem; color: var(--color-text-muted); pointer-events: none; }
.user-filter-input {
  padding: 0.5rem 0.75rem 0.5rem 1.9rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 7px; color: var(--color-text); font-size: 0.82rem; width: 148px;
  transition: border-color var(--transition), width var(--transition);
}
.user-filter-input:focus { border-color: var(--color-amber); outline: none; width: 180px; }
.user-filter-input::placeholder { color: var(--color-text-muted); }
.filter-spinner {
  position: absolute; right: 0.6rem;
  width: 12px; height: 12px;
  border: 1.5px solid var(--color-border); border-top-color: var(--color-amber);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

.search-wrap { position: relative; }
.search-icon {
  position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%);
  color: var(--color-text-muted); pointer-events: none;
}
.search-input {
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 7px; color: var(--color-text); font-size: 0.85rem; width: 200px;
  transition: border-color var(--transition), width var(--transition);
}
.search-input:focus { border-color: var(--color-amber); outline: none; width: 260px; }
.search-input::placeholder { color: var(--color-text-muted); }

.sort-select {
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 7px; color: var(--color-text); font-size: 0.85rem;
  cursor: pointer; transition: border-color var(--transition);
}
.sort-select:focus { border-color: var(--color-amber); outline: none; }
.sort-select option { background: #120800; }

.reset-btn {
  font-size: 0.78rem; color: var(--color-text-muted);
  background: transparent; border: 1px solid var(--color-border);
  border-radius: 7px; padding: 0.5rem 0.65rem;
  transition: color var(--transition); cursor: pointer;
}
.reset-btn:hover { color: var(--color-text); }

/* Onglets type */
.type-tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; border-bottom: 1px solid var(--color-border); padding-bottom: 0; }
.type-tab {
  padding: 0.45rem 1rem; font-size: 0.82rem; color: var(--color-text-muted);
  border-radius: 6px 6px 0 0; border-bottom: 2px solid transparent;
  transition: color var(--transition), border-color var(--transition); margin-bottom: -1px;
}
.type-tab:hover { color: var(--color-text); }
.router-link-active.type-tab { color: var(--color-amber); border-bottom-color: var(--color-amber); }

/* État chargement / vide */
.category-status { display: flex; justify-content: center; padding: 4rem 0; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--color-border); border-top-color: var(--color-amber);
  border-radius: 50%; animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.category-empty { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 0; }
.category-empty__text { font-family: var(--font-serif); font-size: 1.3rem; color: var(--color-text-muted); font-style: italic; }
.btn-amber {
  padding: 0.65rem 1.3rem; background: var(--color-amber); color: #0d0600;
  font-weight: 600; border-radius: 8px; font-size: 0.9rem; transition: background var(--transition);
}
.btn-amber:hover { background: var(--color-amber-lt); }

/* Grille */
.works-grid { display: grid; grid-template-columns: repeat(auto-fill, 172px); gap: 2rem 1.5rem; justify-content: center; }

.pagination {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 0.75rem; padding-top: 0.5rem;
}
.pagination__controls { display: flex; align-items: center; gap: 0.3rem; }
.pagination__btn {
  min-width: 32px; height: 32px; padding: 0 0.4rem;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--color-border); border-radius: 6px;
  background: rgba(255, 255, 255, 0.03); color: var(--color-text-muted);
  font-size: 0.82rem; transition: all var(--transition); cursor: pointer;
}
.pagination__btn:hover:not(:disabled) { border-color: var(--color-amber); color: var(--color-amber); }
.pagination__btn--active { border-color: var(--color-amber); background: rgba(200, 130, 26, 0.12); color: var(--color-amber-lt); font-weight: 600; }
.pagination__btn:disabled { opacity: 0.3; cursor: default; }
.pagination__ellipsis { font-size: 0.82rem; color: var(--color-text-muted); padding: 0 0.2rem; }
.pagination__meta { display: flex; align-items: center; gap: 0.75rem; }
.pagination__info { font-size: 0.78rem; color: var(--color-text-muted); }
.pagination__per-page {
  padding: 0.35rem 0.6rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 6px; color: var(--color-text-muted); font-size: 0.78rem;
  cursor: pointer; transition: border-color var(--transition);
}
.pagination__per-page:focus { border-color: var(--color-amber); outline: none; }
.pagination__per-page option { background: #120800; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 1024px) { .category-main { padding: 1.5rem 1.5rem 4rem; } }
@media (max-width: 768px) {
  .category-main { padding: 1.2rem 1rem 4rem; }
  .category-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .category-header__right { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; width: 100%; }
  .filter-btn { justify-content: center; }
  .user-filter-wrap { width: 100%; }
  .user-filter-input { width: 100%; box-sizing: border-box; }
  .user-filter-input:focus { width: 100%; }
  .search-wrap { width: 100%; }
  .search-input { width: 100%; box-sizing: border-box; }
  .search-input:focus { width: 100%; }
  .sort-select { width: 100%; }
  .reset-btn { grid-column: span 2; }
  .filter-bar { gap: 0.75rem; }
  .filter-bar__meta { flex-wrap: wrap; }
  .works-grid { grid-template-columns: repeat(auto-fill, 110px); gap: 1.2rem 0.8rem; justify-content: center; }
}
</style>
