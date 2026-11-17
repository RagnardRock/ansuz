<template>
  <div class="admin-page">
    <header class="admin-header">
      <router-link to="/" class="admin-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Bibliothèque
      </router-link>
      <h1 class="admin-title">Modération</h1>
    </header>

    <!-- Statistiques globales -->
    <div class="admin-stats">
      <div class="admin-stat">
        <span class="admin-stat__value">{{ users.length }}</span>
        <span class="admin-stat__label">utilisateurs</span>
      </div>
      <div class="admin-stat">
        <span class="admin-stat__value">{{ worksStore.works.length }}</span>
        <span class="admin-stat__label">œuvres</span>
      </div>
      <div class="admin-stat">
        <span class="admin-stat__value">{{ totalReviews }}</span>
        <span class="admin-stat__label">avis</span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
      <button :class="['admin-tab', { active: tab === 'users' }]" @click="tab = 'users'">
        Utilisateurs
      </button>
      <button :class="['admin-tab', { active: tab === 'works' }]" @click="tab = 'works'">
        Œuvres
      </button>
      <button :class="['admin-tab', { active: tab === 'pending' }]" @click="tab = 'pending'">
        En attente
        <span v-if="pendingWorks.length > 0" class="pending-badge">{{ pendingWorks.length }}</span>
      </button>
    </div>

    <!-- Onglet Utilisateurs -->
    <section v-if="tab === 'users'">
      <div v-if="loadingUsers" class="admin-loading">
        <span class="spinner" />
      </div>
      <div v-else-if="usersError" class="admin-error">{{ usersError }}</div>
      <div v-else>
        <div class="works-toolbar">
          <input v-model="usersSearch" class="works-search" type="search" placeholder="Rechercher par nom ou email…" />
          <span class="works-count">{{ filteredUsers.length }} / {{ users.length }}</span>
        </div>
        <div class="users-list">
        <div v-for="user in filteredUsers" :key="user.id" class="user-row">
          <div class="user-row__avatar">
            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="user-avatar" />
            <div v-else class="user-avatar user-avatar--initials">{{ user.username[0].toUpperCase() }}</div>
          </div>

          <div class="user-row__info">
            <div class="user-row__name">
              <router-link :to="{ name: 'profile', params: { username: user.username } }" class="user-row__username">
                {{ user.username }}
              </router-link>
              <span v-if="user.is_admin" class="badge-admin">Admin</span>
              <span v-if="user.id === auth.user?.id" class="badge-self">Vous</span>
            </div>
            <span class="user-row__email">{{ user.email }}</span>
          </div>

          <div class="user-row__meta">
            <span class="user-row__reviews">{{ user.review_count }} avis</span>
            <span class="user-row__follows">{{ user.followers_count }} abon. · suit {{ user.following_count }}</span>
            <span class="user-row__date">{{ formatDate(user.created_at) }}</span>
          </div>

          <button
            v-if="user.id !== auth.user?.id"
            class="user-row__delete"
            title="Supprimer cet utilisateur"
            @click="confirmDeleteUser(user)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
              <path d="M10,11v6" /><path d="M14,11v6" />
              <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
            </svg>
          </button>
          <div v-else class="user-row__delete-placeholder" />
        </div>
        </div>
      </div>
    </section>

    <!-- Onglet Œuvres -->
    <section v-if="tab === 'works'">
      <div v-if="worksStore.loading" class="admin-loading">
        <span class="spinner" />
      </div>
      <div v-else>
        <div class="works-toolbar">
          <input
            v-model="worksSearch"
            class="works-search"
            type="search"
            placeholder="Rechercher par titre ou auteur…"
          />
          <div class="works-type-filters">
            <button
              v-for="t in ['all', ...Object.keys(TYPE_NAMES)]" :key="t"
              class="works-type-btn" :class="{ active: worksTypeFilter === t }"
              @click="worksTypeFilter = t"
            >{{ t === 'all' ? 'Tous' : TYPE_NAMES[t] }}</button>
          </div>
          <span class="works-count">{{ filteredWorks.length }} / {{ worksStore.works.length }}</span>

        </div>
      <div class="works-list">
        <div v-for="work in paginatedWorks" :key="work.id" class="work-row">
          <div class="work-row__cover">
            <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
            <div v-else class="work-row__cover-placeholder" :style="{ background: placeholderFor(work.title) }" />
          </div>

          <div class="work-row__info">
            <span class="work-row__type">{{ TYPE_NAMES[work.type] ?? work.type }}</span>
            <p class="work-row__title">{{ work.title }}</p>
            <span class="work-row__meta">
              {{ work.review_count }} avis
              <template v-if="work.avg_rating"> · ★ {{ work.avg_rating }}</template>
              · {{ formatDate(work.created_at) }}
            </span>
          </div>

          <button class="work-row__edit" title="Modifier" @click="openEdit(work)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="work-row__delete" title="Supprimer cette œuvre" @click="confirmDeleteWork(work)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6" />
              <path d="M10,11v6" /><path d="M14,11v6" />
              <path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V6" />
            </svg>
          </button>
        </div>

        <p v-if="filteredWorks.length === 0" class="admin-empty">Aucune œuvre.</p>
      </div>
      <div v-if="worksTotalPages > 1" class="works-pagination">
        <button class="wpag-btn" :disabled="worksPage === 1" @click="worksPage = 1">«</button>
        <button class="wpag-btn" :disabled="worksPage === 1" @click="worksPage--">‹</button>
        <span class="wpag-info">{{ worksPage }} / {{ worksTotalPages }}</span>
        <button class="wpag-btn" :disabled="worksPage === worksTotalPages" @click="worksPage++">›</button>
        <button class="wpag-btn" :disabled="worksPage === worksTotalPages" @click="worksPage = worksTotalPages">»</button>
      </div>
      </div>
    </section>

    <!-- Onglet En attente -->
    <section v-if="tab === 'pending'">
      <div v-if="loadingPending" class="admin-loading"><span class="spinner" /></div>
      <div v-else-if="pendingWorks.length === 0" class="admin-empty">Aucune œuvre en attente.</div>
      <div v-else class="works-list">
        <div v-for="work in pendingWorks" :key="work.id" class="work-row work-row--pending">
          <!-- En-tête cliquable -->
          <div class="pending-row-header" @click="toggleInspect(work.id)">
            <div class="work-row__cover">
              <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
              <div v-else class="work-row__cover-placeholder" :style="{ background: placeholderFor(work.title) }" />
            </div>
            <div class="work-row__info">
              <span class="work-row__type">{{ TYPE_NAMES[work.type] ?? work.type }}</span>
              <p class="work-row__title">{{ work.title }}</p>
              <span class="work-row__meta">
                par {{ work.created_by_username }} · {{ formatDate(work.created_at) }}
                <span v-if="!work.cdn_source" class="badge-no-cdn">Sans CDN</span>
              </span>
            </div>
            <svg class="inspect-chevron" :class="{ open: inspectOpen === work.id }"
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>

          <!-- Panneau d'inspection -->
          <div v-if="inspectOpen === work.id" class="inspect-panel">
            <div class="inspect-grid">
              <div v-if="work.author" class="inspect-field"><span class="inspect-label">Auteur</span><span>{{ work.author }}</span></div>
              <div v-if="work.release_year" class="inspect-field"><span class="inspect-label">Année</span><span>{{ work.release_year }}</span></div>
              <div v-if="work.genres?.length" class="inspect-field"><span class="inspect-label">Genres</span><span>{{ work.genres.join(', ') }}</span></div>
              <div v-if="work.duration" class="inspect-field"><span class="inspect-label">Durée</span><span>{{ work.duration }} min</span></div>
              <div v-if="work.page_count" class="inspect-field"><span class="inspect-label">Pages</span><span>{{ work.page_count }}</span></div>
              <div v-if="work.publisher" class="inspect-field"><span class="inspect-label">Éditeur</span><span>{{ work.publisher }}</span></div>
              <div v-if="work.isbn" class="inspect-field"><span class="inspect-label">ISBN</span><span>{{ work.isbn }}</span></div>
              <div v-if="work.language" class="inspect-field"><span class="inspect-label">Langue</span><span>{{ work.language }}</span></div>
              <div v-if="work.status" class="inspect-field"><span class="inspect-label">Statut</span><span>{{ work.status }}</span></div>
              <div v-if="work.volume_count" class="inspect-field"><span class="inspect-label">Volumes</span><span>{{ work.volume_count }}</span></div>
              <div v-if="work.origin" class="inspect-field"><span class="inspect-label">Origine</span><span>{{ work.origin }}</span></div>
              <div v-if="work.season_count" class="inspect-field"><span class="inspect-label">Saisons</span><span>{{ work.season_count }}</span></div>
              <div v-if="work.track_count" class="inspect-field"><span class="inspect-label">Pistes</span><span>{{ work.track_count }}</span></div>
              <div v-if="work.platforms?.length" class="inspect-field inspect-field--wide"><span class="inspect-label">Plateformes</span><span>{{ work.platforms.join(', ') }}</span></div>
              <div v-if="work.main_cast?.length" class="inspect-field inspect-field--wide"><span class="inspect-label">Casting</span><span>{{ work.main_cast.join(', ') }}</span></div>
              <div v-if="work.link" class="inspect-field inspect-field--wide"><span class="inspect-label">Lien</span><a :href="work.link" target="_blank" class="inspect-link">{{ work.link }}</a></div>
            </div>
            <p v-if="work.description" class="inspect-synopsis">{{ work.description }}</p>
            <div class="inspect-source">
              Source : <strong>{{ work.cdn_source ?? 'Saisie manuelle' }}</strong>
            </div>
          </div>

          <!-- Actions -->
          <div class="pending-actions">
            <button class="btn-edit" @click="openEdit(work)">✎ Modifier</button>
            <button class="btn-approve" @click="approveWork(work)">✓ Approuver</button>
            <button class="btn-reject" @click="rejectWork(work)">✕ Refuser</button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <Teleport to="body">
    <Transition name="modal">
      <WorkEditModal
        v-if="editingWork"
        :work="editingWork"
        @close="editingWork = null"
        @saved="onWorkSaved"
      />
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useWorksStore } from '@/stores/works.js'
import { adminApi } from '@/api/index.js'
import WorkEditModal from '@/components/WorkEditModal.vue'

const auth = useAuthStore()
const worksStore = useWorksStore()

const tab = ref('users')
const users = ref([])
const loadingUsers = ref(true)
const usersError = ref(null)
const pendingWorks = ref([])
const loadingPending = ref(false)
const inspectOpen = ref(null)
const editingWork = ref(null)
const worksSearch = ref('')
const worksTypeFilter = ref('all')
const worksPage = ref(1)
const WORKS_PER_PAGE = 50
const usersSearch = ref('')

function toggleInspect(id) {
  inspectOpen.value = inspectOpen.value === id ? null : id
}

function openEdit(work) {
  editingWork.value = work
}

function onWorkSaved(updatedWork) {
  // Mettre à jour dans pendingWorks si présent
  const idx = pendingWorks.value.findIndex((w) => w.id === updatedWork.id)
  if (idx !== -1) Object.assign(pendingWorks.value[idx], updatedWork)
  editingWork.value = null
  worksStore.fetchAll()
}

const TYPE_NAMES = {
  book: 'Livre', manga: 'Manga', film: 'Film',
  series: 'Série', music: 'Musique', game: 'Jeu vidéo',
}

const totalReviews = computed(() =>
  users.value.reduce((sum, u) => sum + (u.review_count ?? 0), 0)
)

const filteredUsers = computed(() => {
  const q = usersSearch.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  )
})

const filteredWorks = computed(() => {
  const q = worksSearch.value.trim().toLowerCase()
  return [...worksStore.works]
    .filter((w) => {
      if (worksTypeFilter.value !== 'all' && w.type !== worksTypeFilter.value) return false
      if (q && !w.title?.toLowerCase().includes(q) && !w.author?.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const worksTotalPages = computed(() => Math.max(1, Math.ceil(filteredWorks.value.length / WORKS_PER_PAGE)))
const paginatedWorks = computed(() => {
  const start = (worksPage.value - 1) * WORKS_PER_PAGE
  return filteredWorks.value.slice(start, start + WORKS_PER_PAGE)
})

watch([worksSearch, worksTypeFilter], () => { worksPage.value = 1 })

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}
function placeholderFor(title) {
  const hue = titleHash(title) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
}

async function fetchUsers() {
  loadingUsers.value = true
  usersError.value = null
  try {
    const { data } = await adminApi.getUsers()
    users.value = data
  } catch {
    usersError.value = 'Impossible de charger les utilisateurs.'
  } finally {
    loadingUsers.value = false
  }
}

async function confirmDeleteUser(user) {
  if (!confirm(`Supprimer définitivement le compte de "${user.username}" et tous ses avis ?`)) return
  try {
    await adminApi.deleteUser(user.id)
    users.value = users.value.filter((u) => u.id !== user.id)
    worksStore.fetchAll()
  } catch (e) {
    alert(e.response?.data?.error ?? 'Erreur lors de la suppression.')
  }
}

async function confirmDeleteWork(work) {
  if (!confirm(`Supprimer définitivement "${work.title}" et tous ses avis ?`)) return
  try {
    await worksStore.deleteWork(work.id)
    await fetchUsers()
  } catch (e) {
    alert(e.response?.data?.error ?? 'Erreur lors de la suppression.')
  }
}

async function fetchPendingWorks() {
  loadingPending.value = true
  try {
    const { data } = await adminApi.getPendingWorks()
    pendingWorks.value = data
  } finally {
    loadingPending.value = false
  }
}

async function approveWork(work) {
  await adminApi.approveWork(work.id)
  pendingWorks.value = pendingWorks.value.filter((w) => w.id !== work.id)
  worksStore.fetchAll()
}

async function rejectWork(work) {
  if (!confirm(`Refuser et supprimer "${work.title}" ?`)) return
  await adminApi.rejectWork(work.id)
  pendingWorks.value = pendingWorks.value.filter((w) => w.id !== work.id)
}

onMounted(async () => {
  await Promise.all([
    fetchUsers(),
    fetchPendingWorks(),
    worksStore.works.length === 0 ? worksStore.fetchAll() : null,
  ])
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.admin-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.admin-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  transition: color var(--transition);
  flex-shrink: 0;
}
.admin-back:hover { color: var(--color-amber); }
.admin-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--color-amber-lt);
  font-weight: 400;
  font-style: italic;
}

/* Stats */
.admin-stats {
  display: flex;
  gap: 2rem;
}
.admin-stat {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.admin-stat__value {
  font-size: 1.6rem;
  font-family: var(--font-serif);
  color: var(--color-amber-lt);
}
.admin-stat__label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Tabs */
.admin-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0;
}
.admin-tab {
  padding: 0.55rem 1.1rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  border-radius: 6px 6px 0 0;
  border-bottom: 2px solid transparent;
  transition: color var(--transition), border-color var(--transition);
  background: transparent;
  margin-bottom: -1px;
}
.admin-tab.active {
  color: var(--color-amber);
  border-bottom-color: var(--color-amber);
}
.admin-tab:hover:not(.active) { color: var(--color-text); }

/* Loading / Error / Empty */
.admin-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.admin-error { color: var(--color-error); font-size: 0.9rem; }
.admin-empty { color: var(--color-text-muted); font-style: italic; font-size: 0.9rem; padding: 2rem 0; }

/* User rows */
.users-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
.user-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color var(--transition);
}
.user-row:hover { border-color: rgba(200, 130, 26, 0.2); }

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-avatar--initials {
  background: rgba(200, 130, 26, 0.12);
  border-color: rgba(200, 130, 26, 0.3);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-amber);
}

.user-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.user-row__name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.user-row__username {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: 500;
  transition: color var(--transition);
}
.user-row__username:hover { color: var(--color-amber); }
.user-row__email {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-admin {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-amber);
  background: rgba(200, 130, 26, 0.12);
  border: 1px solid rgba(200, 130, 26, 0.3);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}
.badge-self {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

.user-row__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  flex-shrink: 0;
}
.user-row__reviews {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}
.user-row__follows {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}
.user-row__date {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.user-row__delete, .work-row__delete {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--color-text-muted);
  background: transparent;
  opacity: 0.4;
  transition: opacity var(--transition), color var(--transition), background var(--transition);
}
.user-row__delete:hover, .work-row__delete:hover {
  opacity: 1;
  color: var(--color-error);
}
.user-row__delete-placeholder {
  width: 32px;
  flex-shrink: 0;
}

/* Works toolbar */
.works-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  padding-bottom: 0.75rem;
}
.works-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.85rem;
  transition: border-color var(--transition);
}
.works-search:focus { border-color: var(--color-amber); outline: none; }
.works-search::placeholder { color: var(--color-text-muted); }
.works-type-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.works-type-btn {
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  transition: all var(--transition);
}
.works-type-btn:hover { border-color: var(--color-amber); color: var(--color-amber-lt); }
.works-type-btn.active { background: rgba(200, 130, 26, 0.15); border-color: var(--color-amber); color: var(--color-amber-lt); }
.works-count {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  opacity: 0.6;
}

/* Works list */
.works-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
.work-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  transition: border-color var(--transition);
  min-width: 0;
}
.work-row:hover { border-color: rgba(200, 130, 26, 0.2); }

.work-row__cover {
  width: 36px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
}
.work-row__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.work-row__cover-placeholder {
  width: 100%;
  height: 100%;
}

.work-row__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.work-row__type {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-amber);
  font-weight: 600;
}
.work-row__title {
  font-family: var(--font-serif);
  font-size: 0.95rem;
  color: var(--color-text);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.work-row__meta {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--color-error);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 9px;
  margin-left: 0.4rem;
}
.work-row--pending {
  border-color: rgba(200, 130, 26, 0.3);
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
}
.pending-row-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}
.pending-row-header:hover { background: rgba(255,255,255,0.02); }
.inspect-chevron { flex-shrink: 0; color: var(--color-text-muted); transition: transform 0.2s; }
.inspect-chevron.open { transform: rotate(180deg); }

.badge-no-cdn {
  font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--color-amber); background: rgba(200,130,26,0.1);
  border: 1px solid rgba(200,130,26,0.3); border-radius: 4px; padding: 0.1rem 0.4rem;
  margin-left: 0.4rem;
}

.inspect-panel {
  border-top: 1px solid var(--color-border);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(255,255,255,0.01);
}
.inspect-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
}
.inspect-field {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.82rem;
}
.inspect-field--wide { grid-column: 1 / -1; }
.inspect-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.inspect-synopsis {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  font-style: italic;
}
.inspect-link { color: var(--color-amber); font-size: 0.82rem; word-break: break-all; }
.inspect-source { font-size: 0.75rem; color: var(--color-text-muted); }

.pending-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
}
.pending-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.btn-edit {
  padding: 0.35rem 0.75rem; font-size: 0.78rem; border-radius: 6px;
  background: rgba(255,255,255,0.04); color: var(--color-text-muted);
  border: 1px solid var(--color-border); transition: all var(--transition);
}
.btn-edit:hover { border-color: var(--color-amber); color: var(--color-amber); }
.work-row__edit {
  flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center;
  justify-content: center; border-radius: 6px; color: var(--color-text-muted);
  background: transparent; opacity: 0.4; transition: opacity var(--transition), color var(--transition);
}
.work-row__edit:hover { opacity: 1; color: var(--color-amber); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.works-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem 0 0.5rem;
}
.wpag-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-size: 0.85rem;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  background: transparent;
  transition: all var(--transition);
}
.wpag-btn:hover:not(:disabled) { border-color: var(--color-amber); color: var(--color-amber); }
.wpag-btn:disabled { opacity: 0.25; cursor: default; }
.wpag-info {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  min-width: 60px;
  text-align: center;
}

.btn-approve {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  border-radius: 6px;
  background: rgba(76, 175, 130, 0.15);
  color: #4caf82;
  border: 1px solid rgba(76, 175, 130, 0.4);
  transition: background var(--transition);
}
.btn-approve:hover { background: rgba(76, 175, 130, 0.3); }
.btn-reject {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  border-radius: 6px;
  background: rgba(224, 80, 80, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(224, 80, 80, 0.3);
  transition: background var(--transition);
}
.btn-reject:hover { background: rgba(224, 80, 80, 0.2); }

@media (max-width: 768px) {
  .admin-page { padding: 1.5rem 1rem 4rem; }
  .admin-stats { gap: 1.5rem; }
  .user-row__email { display: none; }
  .user-row__date { display: none; }
  .users-list, .works-list { grid-template-columns: 1fr; }
}
</style>
