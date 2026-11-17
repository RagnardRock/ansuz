<template>
  <div class="library-page">
    <canvas ref="canvasRef" class="library-canvas" aria-hidden="true" />

    <Navbar @create="showCreate = true" />

    <main class="library-main">
      <div v-if="worksStore.loading" class="library-status">
        <span class="spinner-lg" />
        <p>Ouverture de la bibliothèque…</p>
      </div>

      <div v-else-if="worksStore.error" class="library-status library-status--error">
        <p>{{ worksStore.error }}</p>
        <button @click="worksStore.fetchAll()">Réessayer</button>
      </div>

      <div v-else-if="worksStore.works.length === 0" class="library-empty">
        <p class="library-empty__text">Les étagères sont vides.</p>
        <p class="library-empty__sub">Soyez le premier à partager une œuvre !</p>
        <button v-if="auth.isLoggedIn" class="btn-amber" @click="showCreate = true">
          + Ajouter une œuvre
        </button>
        <router-link v-else to="/auth" class="btn-amber">Se connecter pour contribuer</router-link>
      </div>

      <template v-else>
        <!-- Filtres -->
        <div class="library-filters">
          <div class="filter-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="filter-search__icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchText"
              class="filter-input"
              placeholder="Rechercher un titre…"
              type="search"
            />
          </div>

          <!-- Filtre par type (pills) -->
          <div class="type-filter">
            <button
              class="type-btn"
              :class="{ active: filterType === '' }"
              @click="filterType = ''"
            >Tout</button>
            <button
              v-for="t in TYPES"
              :key="t.value"
              class="type-btn"
              :class="{ active: filterType === t.value }"
              @click="filterType = t.value"
            >{{ t.label }}</button>
          </div>

          <select v-model="sortBy" class="filter-select">
            <option value="date-desc">Plus récent</option>
            <option value="date-asc">Plus ancien</option>
            <option value="rating">Meilleure note</option>
            <option value="reviews">Plus d'avis</option>
            <option value="alpha">A → Z</option>
          </select>

          <button v-if="hasFilters" class="filter-reset" @click="resetFilters">
            ✕ Réinitialiser
          </button>
        </div>

        <!-- Tendances (top œuvres par avis, visible sans filtre actif) -->
        <section v-if="!hasFilters && trendingWorks.length >= 3" class="trending-section">
          <header class="type-section__header">
            <span class="type-section__name">Tendances</span>
            <span class="type-section__count">les plus notées</span>
          </header>
          <div class="trending-list">
            <button
              v-for="(work, i) in trendingWorks"
              :key="work.id"
              class="trending-item"
              @click="openWork(work)"
            >
              <span class="trending-rank">{{ i + 1 }}</span>
              <div class="trending-cover">
                <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
                <div v-else class="trending-cover__placeholder" :style="{ background: placeholderFor(work.title) }" />
              </div>
              <div class="trending-info">
                <span class="trending-type">{{ TYPE_LABELS[work.type] ?? work.type }}</span>
                <p class="trending-title">{{ work.title }}</p>
                <div class="trending-meta">
                  <span v-if="work.avg_rating" class="trending-rating">★ {{ work.avg_rating }}</span>
                  <span class="trending-count">{{ work.review_count }} avis</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <!-- Résultat vide après filtrage -->
        <div v-if="filteredSections.length === 0" class="library-empty">
          <p class="library-empty__text">Aucun résultat.</p>
        </div>

        <!-- Sections par type -->
        <section v-for="section in filteredSections" :key="section.type" class="type-section">
          <header class="type-section__header">
            <span class="type-section__name">{{ section.label }}</span>
            <span class="type-section__count">
              {{ section.works.length }} œuvre{{ section.works.length > 1 ? 's' : '' }}
            </span>
          </header>

          <div class="shelf">
            <div class="shelf__books">
              <Book
                v-for="work in section.works"
                :key="work.id"
                :work="work"
                @open="openWork"
              />
            </div>
            <div class="shelf__plank" aria-hidden="true" />
          </div>
        </section>
      </template>
    </main>

    <!-- Modal détail -->
    <Teleport to="body">
      <Transition name="modal">
        <BookDetail
          v-if="selectedWork"
          :work="selectedWork"
          @close="selectedWork = null"
          @work-deleted="selectedWork = null"
        />
      </Transition>
    </Teleport>

    <footer class="library-footer">
      <router-link to="/mentions-legales" class="library-footer__link">Mentions légales</router-link>
    </footer>

    <!-- Modal création -->
    <Teleport to="body">
      <Transition name="modal">
        <CreateWorkModal
          v-if="showCreate"
          @close="showCreate = false"
          @created="showCreate = false"
          @open-work="(work) => { showCreate = false; selectedWork = work }"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWorksStore } from '@/stores/works.js'
import { useAuthStore } from '@/stores/auth.js'
import { useLibraryScene } from '@/composables/useLibraryScene.js'
import Navbar from '@/components/Navbar.vue'
import Book from '@/components/Book.vue'
import BookDetail from '@/components/BookDetail.vue'
import CreateWorkModal from '@/components/CreateWorkModal.vue'

const worksStore = useWorksStore()
const auth = useAuthStore()
const canvasRef = ref(null)
const selectedWork = ref(null)
const showCreate = ref(false)
const searchText = ref('')
const filterType = ref('')
const sortBy = ref('date-desc')

const TYPES = [
  { value: 'book', label: 'Livres' },
  { value: 'manga', label: 'Mangas' },
  { value: 'film', label: 'Films' },
  { value: 'music', label: 'Musique' },
  { value: 'game', label: 'Jeux' },
]
const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))

const hasFilters = computed(
  () => searchText.value.trim() || filterType.value || sortBy.value !== 'date-desc'
)

const trendingWorks = computed(() =>
  [...worksStore.works]
    .filter((w) => (w.review_count ?? 0) > 0)
    .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, 5)
)

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}
function placeholderFor(title) {
  const hue = titleHash(title) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
}

const filteredSections = computed(() => {
  let works = worksStore.works

  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase()
    works = works.filter((w) => w.title.toLowerCase().includes(q))
  }
  if (filterType.value) {
    works = works.filter((w) => w.type === filterType.value)
  }

  const sorted = [...works].sort((a, b) => {
    switch (sortBy.value) {
      case 'date-asc':
        return new Date(a.created_at) - new Date(b.created_at)
      case 'rating':
        return (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
      case 'reviews':
        return (b.review_count ?? 0) - (a.review_count ?? 0)
      case 'alpha':
        return a.title.localeCompare(b.title, 'fr')
      default:
        return new Date(b.created_at) - new Date(a.created_at)
    }
  })

  // Grouper par type dans l'ordre défini
  const typeOrder = TYPES.map((t) => t.value)
  const map = new Map(typeOrder.map((t) => [t, []]))
  for (const work of sorted) {
    const type = work.type ?? 'book'
    if (!map.has(type)) map.set(type, [])
    map.get(type).push(work)
  }

  return [...map.entries()]
    .filter(([, works]) => works.length > 0)
    .map(([type, works]) => ({ type, label: TYPE_LABELS[type] ?? type, works }))
})

function resetFilters() {
  searchText.value = ''
  filterType.value = ''
  sortBy.value = 'date-desc'
}

function openWork(work) {
  selectedWork.value = work
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') worksStore.fetchAll()
}

let sceneCleanup = null
onMounted(async () => {
  await worksStore.fetchAll()
  sceneCleanup = useLibraryScene(canvasRef.value)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onUnmounted(() => {
  sceneCleanup?.dispose()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.library-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}
.library-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
.library-main {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 2rem 3rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Filtres */
.library-filters {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.filter-search {
  position: relative;
  flex: 1;
  min-width: 180px;
}
.filter-search__icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.filter-input {
  width: 100%;
  padding: 0.55rem 0.85rem 0.55rem 2.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.88rem;
  transition: border-color var(--transition);
}
.filter-input:focus {
  border-color: var(--color-amber);
  outline: none;
}
.filter-input::placeholder { color: var(--color-text-muted); }
.filter-select {
  padding: 0.55rem 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.88rem;
  cursor: pointer;
  transition: border-color var(--transition);
}
.filter-select:focus {
  border-color: var(--color-amber);
  outline: none;
}
.filter-select option { background: #120800; }
.filter-reset {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 0.8rem;
  white-space: nowrap;
  transition: color var(--transition), border-color var(--transition);
}
.filter-reset:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

/* Type pills */
.type-filter {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.type-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}
.type-btn:hover {
  border-color: var(--color-amber);
  color: var(--color-amber);
}
.type-btn.active {
  background: rgba(200, 130, 26, 0.15);
  border-color: var(--color-amber);
  color: var(--color-amber);
}

/* États */
.library-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 60vh;
  color: var(--color-text-muted);
}
.library-status--error { color: var(--color-error); }
.spinner-lg {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.library-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  min-height: 40vh;
  text-align: center;
}
.library-empty__text {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  color: var(--color-text);
  font-style: italic;
}
.library-empty__sub {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

/* Sections par type */
.type-section {
  margin-bottom: 2.5rem;
}
.type-section__header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0 1rem 0.6rem;
  border-bottom: 1px solid rgba(200, 130, 26, 0.15);
  margin-bottom: 0;
}
.type-section__name {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--color-amber-lt);
  font-style: italic;
}
.type-section__count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

/* Étagères */
.shelf { position: relative; }
.shelf__books {
  display: flex;
  align-items: flex-end;
  gap: 1.8rem;
  padding: 1.5rem 1rem 1.4rem;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
  background: linear-gradient(180deg, rgba(30, 15, 5, 0) 0%, rgba(30, 15, 5, 0.5) 100%);
}
.shelf__books::-webkit-scrollbar { height: 4px; }
.shelf__books::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
.shelf__plank {
  height: 18px;
  background: linear-gradient(180deg, #5c3a1e 0%, #3d2510 60%, #2a1a0c 100%);
  border-radius: 2px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 200, 100, 0.1) inset;
}

.btn-amber {
  display: inline-block;
  padding: 0.7rem 1.4rem;
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 600;
  border-radius: 8px;
  transition: background var(--transition);
  text-align: center;
}
.btn-amber:hover { background: var(--color-amber-lt); }

.library-footer {
  position: relative;
  z-index: 1;
  padding: 1rem 3rem 2rem;
  text-align: center;
}
.library-footer__link {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  opacity: 0.5;
  transition: opacity var(--transition);
}
.library-footer__link:hover { opacity: 1; }

/* Tendances */
.trending-section {
  margin-bottom: 2.5rem;
}
.trending-list {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1rem 0.5rem;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.trending-list::-webkit-scrollbar { height: 3px; }
.trending-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.trending-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem 0.7rem 0.6rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  min-width: 220px;
  flex-shrink: 0;
  text-align: left;
  transition: border-color var(--transition), background var(--transition);
}
.trending-item:hover {
  border-color: rgba(200, 130, 26, 0.35);
  background: rgba(200, 130, 26, 0.05);
}
.trending-rank {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--color-amber);
  opacity: 0.35;
  font-style: italic;
  width: 1.6rem;
  flex-shrink: 0;
  text-align: center;
}
.trending-cover {
  width: 38px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
}
.trending-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.trending-cover__placeholder {
  width: 100%;
  height: 100%;
}
.trending-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.trending-type {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-amber);
  font-weight: 600;
}
.trending-title {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  color: var(--color-text);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}
.trending-meta {
  display: flex;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin-top: 0.1rem;
}
.trending-rating { color: var(--color-amber); opacity: 0.8; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .library-main { padding: 1.2rem 1rem 4rem; }
  .library-filters { gap: 0.5rem; margin-bottom: 1.2rem; }
  .filter-search { min-width: 0; }
  .shelf__books { gap: 1rem; padding: 1.2rem 0.75rem 1rem; }
  .type-section { margin-bottom: 1.8rem; }
  .type-section__header { padding: 0 0.5rem 0.5rem; }
}
</style>
