<template>
  <div class="profile-page">
    <header class="profile-topbar">
      <router-link to="/" class="profile-back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        Accueil
      </router-link>
    </header>

    <div v-if="loading" class="profile-status">
      <span class="spinner" />
    </div>
    <div v-else-if="error" class="profile-status profile-status--error">
      <p>{{ error }}</p>
    </div>

    <template v-else-if="profile">
      <!-- Carte identité -->
      <section class="profile-identity">
        <div class="profile-avatar-wrap">
          <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.username" class="profile-avatar" />
          <div v-else class="profile-avatar profile-avatar--initials">{{ profile.username[0].toUpperCase() }}</div>
          <button v-if="isOwnProfile" class="avatar-edit-btn" title="Modifier l'avatar" @click="showAvatarModal = true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        <div class="profile-info">
          <div class="profile-username-row">
            <h1 class="profile-username">{{ profile.username }}</h1>
            <button v-if="isOwnProfile" class="profile-edit-btn" title="Modifier le profil" @click="openEditModal">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>

          <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>

          <p class="profile-since">Membre depuis {{ memberSince }}</p>

          <div class="profile-stats">
            <span>{{ profile.reviews.length }} avis</span>
            <span class="profile-stats__sep">·</span>
            <button class="profile-stats__link" @click="setTab('followers')">
              {{ profile.followers_count }} abonné{{ profile.followers_count !== 1 ? 's' : '' }}
            </button>
            <span class="profile-stats__sep">·</span>
            <button class="profile-stats__link" @click="setTab('following')">
              {{ profile.following_count }} suivi{{ profile.following_count !== 1 ? 's' : '' }}
            </button>
            <template v-if="avgRating">
              <span class="profile-stats__sep">·</span>
              <span>★ {{ avgRating }} moy.</span>
            </template>
          </div>

          <button
            v-if="auth.isLoggedIn && !isOwnProfile"
            class="btn-follow"
            :class="{ following: profile.is_following }"
            :disabled="followLoading"
            @click="toggleFollow"
          >
            {{ profile.is_following ? 'Abonné ✓' : '+ Suivre' }}
          </button>
        </div>
      </section>

      <!-- Onglets -->
      <div class="profile-tabs">
        <button
          class="profile-tab"
          :class="{ 'profile-tab--active': activeTab === 'reviews' }"
          @click="activeTab = 'reviews'"
        >
          Avis <span class="tab-count">{{ profile.reviews.length }}</span>
        </button>
        <button
          class="profile-tab"
          :class="{ 'profile-tab--active': activeTab === 'following' }"
          @click="setTab('following')"
        >
          Abonnements <span class="tab-count">{{ profile.following_count }}</span>
        </button>
        <button
          class="profile-tab"
          :class="{ 'profile-tab--active': activeTab === 'followers' }"
          @click="setTab('followers')"
        >
          Abonnés <span class="tab-count">{{ profile.followers_count }}</span>
        </button>
        <button
          v-if="isOwnProfile"
          class="profile-tab"
          :class="{ 'profile-tab--active': activeTab === 'settings' }"
          @click="activeTab = 'settings'"
        >
          Paramètres
        </button>
      </div>

      <!-- Contenu onglet Avis -->
      <div v-if="activeTab === 'reviews'" class="tab-content">
        <div v-if="profile.reviews.length === 0" class="tab-empty">
          Aucun avis pour l'instant.
        </div>
        <template v-else>
          <!-- Filtres type -->
          <div class="review-filters">
            <button
              v-for="t in reviewTypeOptions" :key="t"
              class="review-filter-btn" :class="{ active: reviewTypeFilter === t }"
              @click="reviewTypeFilter = t; reviewPage = 1"
            >{{ t === 'all' ? 'Tous' : (TYPE_NAMES[t] ?? t) }}</button>
          </div>

          <div v-if="paginatedReviews.length === 0" class="tab-empty">Aucun avis dans cette catégorie.</div>
          <div v-else class="reviews-grid">
            <button
              v-for="review in paginatedReviews"
              :key="review.id"
              class="review-tile"
              @click="openReview(review)"
            >
              <div class="review-tile__cover">
                <img v-if="review.cover_url" :src="review.cover_url" :alt="review.title" loading="lazy" />
                <div v-else class="review-tile__cover-ph" :style="{ background: placeholderFor(review.title) }" />
              </div>
              <div class="review-tile__overlay">
                <p class="review-tile__title">{{ review.title }}</p>
                <StarDisplay v-if="review.rating" :rating="review.rating" size="sm" />
              </div>
            </button>
          </div>

          <!-- Pagination -->
          <div v-if="reviewTotalPages > 1" class="review-pagination">
            <button class="rpag-btn" :disabled="reviewPage === 1" @click="reviewPage--">‹</button>
            <button
              v-for="p in reviewTotalPages" :key="p"
              class="rpag-btn" :class="{ active: reviewPage === p }"
              @click="reviewPage = p"
            >{{ p }}</button>
            <button class="rpag-btn" :disabled="reviewPage === reviewTotalPages" @click="reviewPage++">›</button>
          </div>
        </template>
      </div>

      <!-- Contenu onglet Abonnements -->
      <div v-else-if="activeTab === 'following'" class="tab-content">
        <div v-if="followListLoading" class="tab-loading"><span class="spinner" /></div>
        <div v-else-if="!followingList || followingList.length === 0" class="tab-empty">
          {{ profile.username }} ne suit personne pour l'instant.
        </div>
        <div v-else class="user-grid">
          <div v-for="user in followingList" :key="user.username" class="user-card">
            <router-link :to="{ name: 'profile', params: { username: user.username } }" class="user-card__link">
              <div class="user-card__avatar">
                <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" />
                <span v-else>{{ user.username[0].toUpperCase() }}</span>
              </div>
              <span class="user-card__name">{{ user.username }}</span>
            </router-link>
            <button
              v-if="auth.isLoggedIn && auth.user.username !== user.username"
              class="user-card__follow"
              :class="{ following: user.is_following }"
              @click="toggleFollowUser(user)"
            >
              {{ user.is_following ? 'Abonné ✓' : '+ Suivre' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Contenu onglet Abonnés -->
      <div v-else-if="activeTab === 'followers'" class="tab-content">
        <div v-if="followListLoading" class="tab-loading"><span class="spinner" /></div>
        <div v-else-if="!followersList || followersList.length === 0" class="tab-empty">
          Aucun abonné pour l'instant.
        </div>
        <div v-else class="user-grid">
          <div v-for="user in followersList" :key="user.username" class="user-card">
            <router-link :to="{ name: 'profile', params: { username: user.username } }" class="user-card__link">
              <div class="user-card__avatar">
                <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" />
                <span v-else>{{ user.username[0].toUpperCase() }}</span>
              </div>
              <span class="user-card__name">{{ user.username }}</span>
            </router-link>
            <button
              v-if="auth.isLoggedIn && auth.user.username !== user.username"
              class="user-card__follow"
              :class="{ following: user.is_following }"
              @click="toggleFollowUser(user)"
            >
              {{ user.is_following ? 'Abonné ✓' : '+ Suivre' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Onglet Paramètres -->
      <div v-else-if="activeTab === 'settings'" class="tab-content">
        <section class="profile-danger">
          <h2 class="profile-danger__title">Préférences</h2>
          <div class="profile-danger__card">
            <div class="profile-danger__desc">
              <p>Animations des fiches</p>
              <p class="profile-danger__hint">Désactive les animations 3D à l'ouverture d'une œuvre.</p>
            </div>
            <button class="btn-toggle" :class="{ active: animationsEnabled }" @click="toggleAnimations">
              {{ animationsEnabled ? 'Activées' : 'Désactivées' }}
            </button>
          </div>
        </section>

        <section class="profile-danger" style="margin-top: 1.5rem;">
          <h2 class="profile-danger__title">Données personnelles</h2>
          <div class="profile-danger__card">
            <div class="profile-danger__desc">
              <p>Exporter mes données</p>
              <p class="profile-danger__hint">Télécharge un fichier JSON contenant ton compte, tes avis et tes upvotes.</p>
            </div>
            <button class="btn-export" :disabled="exportLoading" @click="exportData">
              <span v-if="!exportLoading">Télécharger</span>
              <span v-else class="spinner-sm" />
            </button>
          </div>
        </section>

        <section class="profile-danger" style="margin-top: 1.5rem;">
          <h2 class="profile-danger__title">Suppression du compte</h2>
          <div class="profile-danger__card">
            <div class="profile-danger__desc">
              <p>Supprimer définitivement mon compte</p>
              <p class="profile-danger__hint">Cette action est irréversible. Tous tes avis seront supprimés.</p>
            </div>
            <button class="btn-danger" @click="confirmDeleteAccount">Supprimer mon compte</button>
          </div>
        </section>
      </div>
    </template>

    <!-- Modal BookDetail -->
    <Teleport to="body">
      <Transition name="modal">
        <BookDetail v-if="selectedWork" :work="selectedWork" @close="selectedWork = null" @work-deleted="selectedWork = null" />
      </Transition>
    </Teleport>

    <!-- Modal modification profil -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Modifier le profil</h2>
              <button class="modal-close" @click="closeEditModal">✕</button>
            </div>
            <div class="modal-body">

              <div class="edit-section">
                <h3 class="edit-section__title">Bio</h3>
                <textarea
                  v-model="editBio"
                  class="field-textarea"
                  placeholder="Quelques mots sur toi… (200 car. max)"
                  maxlength="200"
                  rows="3"
                />
                <span class="char-count">{{ editBio.length }}/200</span>
              </div>

              <div class="edit-divider" />

              <div class="edit-section">
                <h3 class="edit-section__title">Nom d'utilisateur</h3>
                <div class="field">
                  <input v-model="editUsername" type="text" placeholder="Nouveau nom d'utilisateur" autocomplete="username" />
                </div>
              </div>

              <div class="edit-divider" />

              <div class="edit-section">
                <h3 class="edit-section__title">Email</h3>
                <div class="field">
                  <input v-model="editEmail" type="email" placeholder="Nouvel email" autocomplete="email" />
                </div>
              </div>

              <div class="edit-divider" />

              <div class="edit-section">
                <h3 class="edit-section__title">Mot de passe</h3>
                <div class="field">
                  <input v-model="editNewPassword" type="password" placeholder="Nouveau mot de passe (8 car. min.)" autocomplete="new-password" />
                </div>
                <div class="field" style="margin-top: 0.6rem;">
                  <input v-model="editConfirmPassword" type="password" placeholder="Confirmer le nouveau mot de passe" autocomplete="new-password" />
                </div>
              </div>

              <Transition name="fade">
                <div v-if="needsCurrentPassword" class="edit-section edit-section--auth">
                  <p class="edit-auth-hint">Confirme ton mot de passe actuel pour valider les changements sensibles :</p>
                  <div class="field">
                    <input v-model="editCurrentPassword" type="password" placeholder="Mot de passe actuel" autocomplete="current-password" />
                  </div>
                </div>
              </Transition>

              <Transition name="fade">
                <p v-if="editError" class="form-error">{{ editError }}</p>
              </Transition>

              <div class="modal-footer">
                <button class="btn-ghost" @click="closeEditModal">Annuler</button>
                <button class="btn-primary" :disabled="editLoading || !editHasChanges" @click="saveEdit">
                  <span v-if="!editLoading">Enregistrer</span>
                  <span v-else class="spinner-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modal avatar -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAvatarModal" class="modal-overlay" @click.self="closeAvatarModal">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Modifier l'avatar</h2>
              <button class="modal-close" @click="closeAvatarModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="avatar-preview-wrap">
                <img v-if="avatarInput" :src="avatarInput" class="avatar-preview" :alt="profile?.username" />
                <div v-else class="avatar-preview avatar-preview--placeholder">{{ profile?.username[0].toUpperCase() }}</div>
              </div>
              <div class="field">
                <label for="avatar-url">URL de l'image</label>
                <input id="avatar-url" v-model="avatarInput" type="url" placeholder="https://cdn.example.com/photo.jpg" />
              </div>
              <p class="avatar-hint">Colle l'URL d'une image (Discord, GitHub, imgur…)</p>
              <Transition name="fade">
                <p v-if="avatarError" class="form-error">{{ avatarError }}</p>
              </Transition>
              <div class="modal-footer">
                <button class="btn-ghost" @click="clearAvatar">Supprimer l'avatar</button>
                <button class="btn-primary" :disabled="avatarLoading" @click="saveAvatar">
                  <span v-if="!avatarLoading">Enregistrer</span>
                  <span v-else class="spinner-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { useWorksStore } from '@/stores/works.js'
import { userApi } from '@/api/index.js'
import { useAnimationPref } from '@/composables/useAnimationPref.js'
import StarDisplay from '@/components/StarDisplay.vue'
import BookDetail from '@/components/BookDetail.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { animationsEnabled, toggle: toggleAnimations } = useAnimationPref()
const worksStore = useWorksStore()

const profile = ref(null)
const loading = ref(true)
const error = ref(null)
const followLoading = ref(false)
const exportLoading = ref(false)
const selectedWork = ref(null)

// Onglets
const activeTab = ref('reviews')
const followingList = ref(null)
const followersList = ref(null)
const followListLoading = ref(false)

// Modal avatar
const showAvatarModal = ref(false)
const avatarInput = ref('')
const avatarLoading = ref(false)
const avatarError = ref('')

// Modal édition
const showEditModal = ref(false)
const editBio = ref('')
const editUsername = ref('')
const editEmail = ref('')
const editNewPassword = ref('')
const editConfirmPassword = ref('')
const editCurrentPassword = ref('')
const editLoading = ref(false)
const editError = ref('')

const TYPE_NAMES = { book: 'Livre', manga: 'Manga', film: 'Film', series: 'Série', music: 'Musique', game: 'Jeu vidéo' }
const REVIEWS_PER_PAGE = 24
const reviewTypeFilter = ref('all')
const reviewPage = ref(1)

const isOwnProfile = computed(() => auth.isLoggedIn && auth.user.username === route.params.username)

const reviewTypeOptions = computed(() => {
  if (!profile.value) return ['all']
  const types = [...new Set(profile.value.reviews.map((r) => r.type))]
  return types.length > 1 ? ['all', ...types] : ['all']
})

const filteredReviews = computed(() => {
  if (!profile.value) return []
  if (reviewTypeFilter.value === 'all') return profile.value.reviews
  return profile.value.reviews.filter((r) => r.type === reviewTypeFilter.value)
})

const reviewTotalPages = computed(() => Math.ceil(filteredReviews.value.length / REVIEWS_PER_PAGE))

const paginatedReviews = computed(() => {
  const start = (reviewPage.value - 1) * REVIEWS_PER_PAGE
  return filteredReviews.value.slice(start, start + REVIEWS_PER_PAGE)
})

const memberSince = computed(() =>
  profile.value
    ? new Date(profile.value.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : ''
)

const avgRating = computed(() => {
  if (!profile.value?.reviews.length) return null
  const rated = profile.value.reviews.filter((r) => r.rating != null)
  if (!rated.length) return null
  return Math.round(rated.reduce((s, r) => s + r.rating, 0) / rated.length * 10) / 10
})

const needsCurrentPassword = computed(
  () =>
    (editEmail.value.trim() && editEmail.value.trim() !== profile.value?.email) ||
    editNewPassword.value.length > 0
)

const editHasChanges = computed(
  () =>
    editBio.value.trim() !== (profile.value?.bio ?? '') ||
    (editUsername.value.trim() && editUsername.value.trim() !== profile.value?.username) ||
    (editEmail.value.trim() && editEmail.value.trim() !== profile.value?.email) ||
    editNewPassword.value.length > 0
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

async function fetchProfile() {
  loading.value = true
  error.value = null
  followingList.value = null
  followersList.value = null
  activeTab.value = 'reviews'
  try {
    const { data } = await userApi.getProfile(route.params.username)
    profile.value = data
  } catch (e) {
    error.value = e.response?.status === 404 ? 'Cet utilisateur n\'existe pas.' : 'Impossible de charger le profil.'
  } finally {
    loading.value = false
  }
}

async function setTab(tab) {
  activeTab.value = tab
  if (tab === 'following' && !followingList.value) {
    followListLoading.value = true
    try {
      const { data } = await userApi.getFollowing(route.params.username)
      followingList.value = data
    } catch {
      followingList.value = []
    } finally {
      followListLoading.value = false
    }
  }
  if (tab === 'followers' && !followersList.value) {
    followListLoading.value = true
    try {
      const { data } = await userApi.getFollowers(route.params.username)
      followersList.value = data
    } catch {
      followersList.value = []
    } finally {
      followListLoading.value = false
    }
  }
}

function openReview(review) {
  const work = worksStore.works.find((w) => w.id === review.work_id)
  if (work) selectedWork.value = work
}

function openEditModal() {
  editBio.value = profile.value?.bio ?? ''
  editUsername.value = profile.value?.username ?? ''
  editEmail.value = ''
  editNewPassword.value = ''
  editConfirmPassword.value = ''
  editCurrentPassword.value = ''
  editError.value = ''
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editError.value = ''
}

async function saveEdit() {
  editError.value = ''
  if (editNewPassword.value && editNewPassword.value !== editConfirmPassword.value) {
    editError.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  if (needsCurrentPassword.value && !editCurrentPassword.value) {
    editError.value = 'Mot de passe actuel requis.'
    return
  }

  const payload = {}
  const newBio = editBio.value.trim()
  if (newBio !== (profile.value?.bio ?? '')) payload.bio = newBio
  if (editUsername.value.trim() && editUsername.value.trim() !== profile.value?.username) {
    payload.username = editUsername.value.trim()
  }
  if (editEmail.value.trim() && editEmail.value.trim() !== profile.value?.email) {
    payload.email = editEmail.value.trim()
  }
  if (editNewPassword.value) payload.new_password = editNewPassword.value
  if (editCurrentPassword.value) payload.current_password = editCurrentPassword.value

  if (Object.keys(payload).length === 0) return

  editLoading.value = true
  try {
    const updated = await auth.updateProfile(payload)
    profile.value = { ...profile.value, ...updated }
    closeEditModal()
    if (updated.username && updated.username !== route.params.username) {
      router.replace({ name: 'profile', params: { username: updated.username } })
    }
  } catch (e) {
    editError.value = e.response?.data?.error ?? 'Erreur lors de la mise à jour.'
  } finally {
    editLoading.value = false
  }
}

function closeAvatarModal() {
  showAvatarModal.value = false
  avatarError.value = ''
}

function clearAvatar() {
  avatarInput.value = ''
  saveAvatar()
}

async function saveAvatar() {
  avatarError.value = ''
  avatarLoading.value = true
  try {
    await auth.updateAvatar(avatarInput.value.trim() || null)
    profile.value.avatar_url = auth.user.avatar_url
    closeAvatarModal()
  } catch (e) {
    avatarError.value = e.response?.data?.error ?? 'Erreur lors de la mise à jour'
  } finally {
    avatarLoading.value = false
  }
}

async function toggleFollow() {
  if (!profile.value) return
  followLoading.value = true
  try {
    const { data } = await userApi.toggleFollow(profile.value.username)
    profile.value.is_following = data.following
    profile.value.followers_count += data.following ? 1 : -1
  } catch {
    // silencieux
  } finally {
    followLoading.value = false
  }
}

async function toggleFollowUser(user) {
  try {
    const { data } = await userApi.toggleFollow(user.username)
    user.is_following = data.following
    if (profile.value.username === auth.user?.username) {
      profile.value.following_count += data.following ? 1 : -1
    }
  } catch {
    // silencieux
  }
}

async function exportData() {
  exportLoading.value = true
  try {
    const { data } = await userApi.exportMe()
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `ansuz-export-${profile.value.username}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // silencieux
  } finally {
    exportLoading.value = false
  }
}

async function confirmDeleteAccount() {
  if (!confirm('Supprimer définitivement ton compte et tous tes avis ?')) return
  await auth.deleteAccount()
}

watch(() => route.params.username, fetchProfile)

onMounted(async () => {
  await fetchProfile()
  if (!worksStore.works.length) worksStore.fetchAll()
  if (isOwnProfile.value && profile.value?.avatar_url) {
    avatarInput.value = profile.value.avatar_url
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  width: 100%;
  max-width: 780px;
  margin: 0 auto;
  padding: 1.5rem 2rem 5rem;
}

/* Topbar */
.profile-topbar {
  padding-bottom: 1.5rem;
}
.profile-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  transition: color var(--transition);
}
.profile-back:hover { color: var(--color-amber); }

/* Spinner */
.profile-status {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
  color: var(--color-text-muted);
}
.profile-status--error { color: var(--color-error); }
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Identité */
.profile-identity {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0;
}
.profile-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.profile-avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-avatar--initials {
  background: rgba(200, 130, 26, 0.12);
  border-color: rgba(200, 130, 26, 0.3);
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-amber);
}
.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-amber);
  color: #0d0600;
  border: 2px solid #0d0600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition);
}
.avatar-edit-btn:hover { background: var(--color-amber-lt); }

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}
.profile-username-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.profile-username {
  font-family: var(--font-serif);
  font-size: 1.7rem;
  color: var(--color-amber-lt);
  font-weight: 400;
  font-style: italic;
}
.profile-edit-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition), color var(--transition), border-color var(--transition);
  flex-shrink: 0;
}
.profile-edit-btn:hover { opacity: 1; color: var(--color-amber); border-color: rgba(200, 130, 26, 0.4); }

.profile-bio {
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.55;
  margin-top: 0.1rem;
}
.profile-since {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
}
.profile-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-top: 0.2rem;
}
.profile-stats__sep { opacity: 0.35; }
.profile-stats__link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition);
}
.profile-stats__link:hover { color: var(--color-amber); }

/* Bouton Suivre */
.btn-follow {
  align-self: flex-start;
  margin-top: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  border: 1px solid var(--color-amber);
  background: transparent;
  color: var(--color-amber);
  font-size: 0.82rem;
  font-weight: 600;
  transition: background var(--transition), color var(--transition);
  cursor: pointer;
}
.btn-follow:hover:not(:disabled) { background: var(--color-amber); color: #0d0600; }
.btn-follow.following { background: rgba(200, 130, 26, 0.12); border-color: rgba(200, 130, 26, 0.4); }
.btn-follow.following:hover:not(:disabled) { background: rgba(224, 80, 80, 0.1); border-color: var(--color-error); color: var(--color-error); }
.btn-follow:disabled { opacity: 0.5; cursor: not-allowed; }

/* Onglets */
.profile-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.75rem;
}
.profile-tab {
  padding: 0.9rem 1.25rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition);
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.profile-tab:hover { color: var(--color-text); }
.profile-tab--active { color: var(--color-amber); border-bottom-color: var(--color-amber); }
.tab-count {
  font-size: 0.72rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 0.1rem 0.5rem;
  color: var(--color-text-muted);
}
.profile-tab--active .tab-count { color: var(--color-amber); background: rgba(200, 130, 26, 0.12); }

/* Contenu onglet */
.tab-content {}
.tab-empty {
  padding: 3rem 0;
  text-align: center;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-style: italic;
}
.tab-loading {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

/* Filtres type avis */
.review-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}
.review-filter-btn {
  padding: 0.25rem 0.7rem;
  font-size: 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  transition: all var(--transition);
}
.review-filter-btn:hover { border-color: var(--color-amber); color: var(--color-amber-lt); }
.review-filter-btn.active { background: rgba(200, 130, 26, 0.15); border-color: var(--color-amber); color: var(--color-amber-lt); }

/* Pagination avis */
.review-pagination {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 1.5rem;
}
.rpag-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.82rem;
  transition: all var(--transition);
}
.rpag-btn:hover:not(:disabled) { border-color: var(--color-amber); color: var(--color-amber); }
.rpag-btn.active { background: var(--color-amber); color: #0d0600; border-color: var(--color-amber); font-weight: 600; }
.rpag-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* Grille avis */
.reviews-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 120px);
  gap: 1rem;
}
.review-tile {
  position: relative;
  width: 120px;
  height: 174px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  transition: border-color var(--transition), transform var(--transition);
  flex-shrink: 0;
}
.review-tile:hover { border-color: rgba(200, 130, 26, 0.4); transform: translateY(-2px); }
.review-tile__cover { width: 100%; height: 100%; }
.review-tile__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.review-tile__cover-ph { width: 100%; height: 100%; }
.review-tile__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0.6rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.review-tile:hover .review-tile__overlay { opacity: 1; }
.review-tile__title {
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: #fff;
  font-style: italic;
  line-height: 1.3;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Listes following/followers */
.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color var(--transition);
}
.user-card:hover { border-color: rgba(200, 130, 26, 0.2); }
.user-card__link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
  color: var(--color-text);
  transition: color var(--transition);
}
.user-card__link:hover { color: var(--color-amber); }
.user-card__avatar {
  width: 32px;
  height: 32px;
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
.user-card__avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.user-card__name { font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-card__follow {
  flex-shrink: 0;
  padding: 0.3rem 0.7rem;
  border-radius: 14px;
  border: 1px solid var(--color-amber);
  background: transparent;
  color: var(--color-amber);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
  white-space: nowrap;
}
.user-card__follow:hover { background: var(--color-amber); color: #0d0600; }
.user-card__follow.following { background: rgba(200, 130, 26, 0.1); border-color: rgba(200, 130, 26, 0.35); }
.user-card__follow.following:hover { background: rgba(224, 80, 80, 0.1); border-color: var(--color-error); color: var(--color-error); }

/* Zone suppression */
.profile-danger {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(224, 80, 80, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.profile-danger__title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-error);
  opacity: 0.55;
  font-weight: 600;
}
.profile-danger__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid rgba(224, 80, 80, 0.18);
  border-radius: 10px;
  background: rgba(224, 80, 80, 0.03);
}
.profile-danger__desc { display: flex; flex-direction: column; gap: 0.2rem; }
.profile-danger__desc p:first-child { font-size: 0.9rem; color: var(--color-text); }
.profile-danger__hint { font-size: 0.78rem; color: var(--color-text-muted); }
.btn-toggle {
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all var(--transition);
  flex-shrink: 0;
}
.btn-toggle.active {
  background: rgba(200, 130, 26, 0.12);
  border-color: var(--color-amber);
  color: var(--color-amber);
}
.btn-toggle:hover { border-color: var(--color-amber); color: var(--color-amber); }

.btn-export {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(200, 130, 26, 0.35);
  border-radius: 8px;
  color: var(--color-amber);
  font-size: 0.85rem;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), border-color var(--transition);
  cursor: pointer;
}
.btn-export:hover:not(:disabled) { background: rgba(200, 130, 26, 0.1); border-color: var(--color-amber); }
.btn-export:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-danger {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid rgba(224, 80, 80, 0.35);
  border-radius: 8px;
  color: var(--color-error);
  font-size: 0.85rem;
  transition: background var(--transition), border-color var(--transition);
  cursor: pointer;
}
.btn-danger:hover { background: rgba(224, 80, 80, 0.1); border-color: var(--color-error); }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  background: #120800;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8);
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
  position: sticky;
  top: 0;
  background: #120800;
  z-index: 1;
}
.modal-header h2 {
  font-family: var(--font-serif);
  font-size: 1.2rem;
  color: var(--color-amber-lt);
}
.modal-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text);
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
  cursor: pointer;
}
.modal-close:hover { background: var(--color-amber); color: #0d0600; }
.modal-body {
  padding: 1.25rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

/* Champs */
.edit-section { display: flex; flex-direction: column; gap: 0.45rem; }
.edit-section__title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
  font-weight: 600;
}
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field label { font-size: 0.78rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.field input,
.field-textarea {
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.88rem;
  transition: border-color var(--transition);
  width: 100%;
  box-sizing: border-box;
}
.field-textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  min-height: 72px;
}
.field input:focus,
.field-textarea:focus { border-color: var(--color-amber); outline: none; }
.field input::placeholder,
.field-textarea::placeholder { color: var(--color-text-muted); }
.char-count { font-size: 0.7rem; color: var(--color-text-muted); opacity: 0.5; text-align: right; }
.edit-divider { height: 1px; background: var(--color-border); opacity: 0.4; }
.edit-section--auth {
  background: rgba(200, 130, 26, 0.05);
  border: 1px solid rgba(200, 130, 26, 0.2);
  border-radius: 8px;
  padding: 0.85rem;
}
.edit-auth-hint { font-size: 0.78rem; color: var(--color-text-muted); font-style: italic; line-height: 1.5; }

.avatar-preview-wrap { display: flex; justify-content: center; }
.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-border);
}
.avatar-preview--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 130, 26, 0.12);
  border-color: rgba(200, 130, 26, 0.3);
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-amber);
}
.avatar-hint { font-size: 0.78rem; color: var(--color-text-muted); font-style: italic; }

.form-error {
  font-size: 0.85rem;
  color: var(--color-error);
  padding: 0.5rem 0.8rem;
  background: rgba(224, 80, 80, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(224, 80, 80, 0.2);
}
.btn-ghost {
  padding: 0.6rem 1rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition);
}
.btn-ghost:hover { border-color: var(--color-error); color: var(--color-error); }
.btn-primary {
  padding: 0.6rem 1.4rem;
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 600;
  font-size: 0.88rem;
  border-radius: 8px;
  min-width: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition);
}
.btn-primary:hover:not(:disabled) { background: var(--color-amber-lt); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(13, 6, 0, 0.3);
  border-top-color: #0d0600;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .profile-page { padding: 1rem 1rem 4rem; }
  .profile-identity { gap: 1rem; }
  .profile-avatar { width: 68px; height: 68px; }
  .profile-username { font-size: 1.4rem; }
  .reviews-grid { grid-template-columns: repeat(auto-fill, 100px); gap: 0.75rem; justify-content: center; }
  .review-tile { width: 100px; height: 146px; }
  .profile-danger__card { flex-direction: column; align-items: flex-start; }
  .user-grid { grid-template-columns: 1fr; }
  .profile-tabs {
    overflow-x: auto;
    scrollbar-width: none;
    flex-wrap: nowrap;
  }
  .profile-tabs::-webkit-scrollbar { display: none; }
  .profile-tab { white-space: nowrap; padding: 0.9rem 0.9rem; font-size: 0.8rem; flex-shrink: 0; }
}
</style>
