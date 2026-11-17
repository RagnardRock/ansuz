<template>
  <div class="home-page">
    <Transition name="splash">
      <div v-if="pageLoading" class="splash">
        <p class="splash-logo">Ansuz</p>
        <div class="splash-dots">
          <span class="dot" /><span class="dot" /><span class="dot" />
        </div>
      </div>
    </Transition>

    <Navbar @create="showCreate = true" />

    <!-- Zone A : Hero + Stats | Widget -->
    <div class="home-a">
      <div class="home-a__left">
        <section class="home-hero">
          <h1 class="hero-title">Ansuz</h1>
          <p class="hero-sub">Le carnet culturel partagé.</p>
          <p class="hero-desc">Recensez vos lectures, films, musiques et jeux vidéo. Partagez vos avis avec votre communauté et découvrez de nouvelles œuvres.</p>
          <div class="hero-actions">
            <router-link v-if="!auth.isLoggedIn" to="/auth?mode=register" class="btn-hero btn-hero--primary">S'inscrire</router-link>
            <a href="https://chromewebstore.google.com/detail/Ansuz/jcelpaedmlhmomgcncpgkalhmfmhdbmi?hl=fr" target="_blank" rel="noopener" class="btn-hero btn-hero--secondary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.5 2.5 0 0 1 0 5H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.5 2.5 0 0 1 5 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5Z"/>
              </svg>
              Extension Chrome
            </a>
          </div>
        </section>
        <section class="home-band">
          <div class="band-stats">
            <div class="band-stat">
              <span class="band-stat__value">{{ fmt(stats.works_count) }}</span>
              <span class="band-stat__label">œuvres</span>
            </div>
            <div class="band-stat">
              <span class="band-stat__value">{{ fmt(stats.reviews_count) }}</span>
              <span class="band-stat__label">avis</span>
            </div>
            <div class="band-stat">
              <span class="band-stat__value">{{ fmt(stats.users_count) }}</span>
              <span class="band-stat__label">membres</span>
            </div>
            <template v-if="stats.avg_rating">
              <div class="band-stat">
                <span class="band-stat__value">{{ stats.avg_rating }}<span class="band-stat__unit">/5</span></span>
                <span class="band-stat__label">note moy.</span>
              </div>
            </template>
          </div>
          <div v-if="typeEntries.length" class="band-types">
            <span v-for="[type, count] in typeEntries" :key="type" class="band-type">
              <span class="band-type__count">{{ fmt(count) }}</span>
              <span class="band-type__label">{{ TYPE_NAMES[type] }}</span>
            </span>
          </div>
        </section>
      </div>
      <div class="home-a__right">
        <DiscoveryWidget @open="openWork" />
      </div>
    </div>

    <!-- Zone B : Feed | Carousels -->
    <main class="home-b">
      <!-- Bgauche : Feed -->
      <section class="home-col home-col--feed">
        <div class="col-header">
          <h2 class="col-title">Feed</h2>
        </div>
        <div v-if="!auth.isLoggedIn" class="col-empty">
          <router-link to="/auth" class="btn-amber-sm">Se connecter</router-link>
          <p>pour voir les avis de tes abonnements</p>
        </div>
        <div v-else-if="feedLoading" class="col-loading"><span class="spinner-sm" /></div>
        <div v-else-if="feedItems.length === 0" class="col-empty">
          <p>Suis des utilisateurs pour voir leurs avis ici.</p>
        </div>
        <div v-else class="feed-list">
          <div v-for="item in feedItems" :key="item.review_id" class="feed-item">
            <router-link :to="{ name: 'profile', params: { username: item.username } }" class="feed-item__author">
              <div class="feed-item__avatar">
                <img v-if="item.avatar_url" :src="item.avatar_url" :alt="item.username" />
                <span v-else>{{ item.username[0].toUpperCase() }}</span>
              </div>
              <span>{{ item.username }}</span>
              <span class="feed-item__date">{{ formatDate(item.created_at) }}</span>
            </router-link>
            <div class="feed-item__work">
              <div class="feed-item__cover">
                <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" loading="lazy" />
                <div v-else class="feed-item__cover-ph" :style="{ background: placeholderFor(item.title) }" />
              </div>
              <div class="feed-item__info">
                <span class="feed-item__type">{{ TYPE_NAMES[item.type] ?? item.type }}</span>
                <p class="feed-item__title">{{ item.title }}</p>
                <StarDisplay v-if="item.rating" :rating="item.rating" size="sm" />
                <p v-if="item.description" class="feed-item__desc">{{ item.description }}</p>
              </div>
            </div>
            <div class="feed-item__footer">
              <button class="feed-item__upvote" :class="{ active: item.user_upvoted }" @click="toggleUpvote(item)">
                ♥ {{ item.upvote_count }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Bdroite : Carousels tendances -->
      <section class="home-col home-col--carousels">
        <div class="carousels-desktop">
          <WorkCarousel title="Tendances du mois" :works="trendingMonth" @open="openWork" />
          <WorkCarousel title="Tendances globales" :works="trendingAll" @open="openWork" />
        </div>
        <div class="carousels-mobile">
          <div class="carousel-toggle-header">
            <h2 class="col-title">Tendances</h2>
            <div class="carousel-toggle">
              <button :class="{ active: mobilePeriod === 'month' }" @click="mobilePeriod = 'month'">Ce mois</button>
              <button :class="{ active: mobilePeriod === 'all' }" @click="mobilePeriod = 'all'">Globales</button>
            </div>
          </div>
          <WorkCarousel :title="''" :works="mobilePeriod === 'month' ? trendingMonth : trendingAll" @open="openWork" />
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <router-link to="/mentions-legales" class="home-footer__link">Mentions légales</router-link>
      <span class="home-footer__sep">·</span>
      <a href="https://ko-fi.com/ansuz" target="_blank" rel="noopener" class="home-footer__link home-footer__link--kofi">☕ Soutenir le projet</a>
    </footer>

    <Teleport to="body">
      <Transition name="modal">
        <BookDetail v-if="selectedWork" :work="selectedWork" @close="selectedWork = null" @work-deleted="selectedWork = null" />
      </Transition>
    </Teleport>
    <Teleport to="body">
      <Transition name="modal">
        <CreateWorkModal v-if="showCreate" @close="showCreate = false" @created="showCreate = false" @open-work="(w) => { showCreate = false; selectedWork = w }" />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { feedApi, statsApi, reviewsApi, trendingApi } from '@/api/index.js'
import Navbar from '@/components/Navbar.vue'
import BookDetail from '@/components/BookDetail.vue'
import CreateWorkModal from '@/components/CreateWorkModal.vue'
import WorkCarousel from '@/components/WorkCarousel.vue'
import DiscoveryWidget from '@/components/DiscoveryWidget.vue'
import StarDisplay from '@/components/StarDisplay.vue'

const router = useRouter()
const auth = useAuthStore()
const selectedWork = ref(null)
const showCreate = ref(false)
const feedItems = ref([])
const feedLoading = ref(false)
const stats = ref({})
const mobilePeriod = ref('month')
const pageLoading = ref(true)
const trendingMonth = ref([])
const trendingAll = ref([])

const TYPE_NAMES = { book: 'Livres', manga: 'Mangas', film: 'Films', series: 'Séries', music: 'Musiques', game: 'Jeux vidéo' }

const typeEntries = computed(() =>
  Object.entries(stats.value.by_type ?? {}).sort((a, b) => b[1] - a[1])
)

function fmt(n) {
  if (n == null) return '—'
  return n.toLocaleString('fr-FR')
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
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function openWork(work) { selectedWork.value = work }

async function toggleUpvote(item) {
  if (!auth.isLoggedIn) return
  const { data } = await reviewsApi.upvote(item.review_id)
  item.user_upvoted = data.upvoted
  item.upvote_count = data.upvote_count
}

function onKeyDown(e) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
  if (e.key === 'l' || e.key === 'L') router.push({ name: 'library', query: { focus: 'search' } })
  if (e.key === 'n' || e.key === 'N') showCreate.value = true
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown)
  if (auth.isLoggedIn) feedLoading.value = true

  const [trendingRes] = await Promise.allSettled([
    trendingApi.get(),
    statsApi.get().then(({ data }) => { stats.value = data }).catch(() => {}),
    auth.isLoggedIn
      ? feedApi.get().then(({ data }) => { feedItems.value = data }).catch(() => {}).finally(() => { feedLoading.value = false })
      : Promise.resolve(),
  ])

  if (trendingRes.status === 'fulfilled') {
    trendingMonth.value = trendingRes.value.data.month ?? []
    trendingAll.value = trendingRes.value.data.all ?? []
  }

  pageLoading.value = false
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
/* Splash */
.splash {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  pointer-events: none;
}
.splash-logo {
  font-family: var(--font-serif);
  font-size: 3.5rem;
  font-style: italic;
  color: var(--color-amber-lt);
  letter-spacing: 0.02em;
  line-height: 1;
}
.splash-dots { display: flex; gap: 0.45rem; }
.dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--color-amber);
  animation: dot-pulse 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}
.splash-enter-active { transition: opacity 0.2s ease; }
.splash-leave-active { transition: opacity 0.4s ease 0.05s; }
.splash-enter-from, .splash-leave-to { opacity: 0; }

.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Zone A ── */
.home-a {
  display: grid;
  grid-template-columns: 3fr 2fr;

  flex-shrink: 0;
}
.home-a__left {
  display: flex;
  flex-direction: column;

}
.home-a__right {
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--color-border);
  border-radius:30px 0px;
  border-bottom: 1px solid var(--color-border);
}

/* Hero */
.home-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 2rem 2.5rem;
  gap: 0.75rem;

}
.hero-title { font-family: var(--font-serif); font-size: 2.4rem; font-weight: 400; font-style: italic; color: var(--color-amber-lt); line-height: 1; }
.hero-sub { font-size: 0.95rem; color: var(--color-text-muted); font-style: italic; }
.hero-desc { font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.7; margin-bottom: 0.25rem; }
.hero-actions { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; }
.btn-hero { display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1.25rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; transition: all var(--transition); }
.btn-hero--primary { background: var(--color-amber); color: #0d0600; }
.btn-hero--primary:hover { background: var(--color-amber-lt); }
.btn-hero--secondary { border: 1px solid rgba(200, 130, 26, 0.4); color: var(--color-amber-lt); }
.btn-hero--secondary:hover { border-color: var(--color-amber); background: rgba(200, 130, 26, 0.08); }

/* Stats */
.home-band {
  padding: 1rem 2.5rem;
  background: linear-gradient(to left, rgba(255,255,255,0.03), transparent);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.band-stats { display: flex; gap: 2rem; justify-content: flex-end;}
.band-stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
.band-stat__value { font-family: var(--font-serif); font-size: 1.3rem; font-style: italic; color: var(--color-amber-lt); line-height: 1; }
.band-stat__unit { font-size: 0.7rem; opacity: 0.6; margin-left: 1px; }
.band-stat__label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
.band-types {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.band-type {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.5rem;
  border-radius: 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--color-border);
  font-size: 0.68rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.band-type__icon { font-size: 0.7rem; line-height: 1; }
.band-type__count { color: var(--color-amber-lt); font-weight: 600; }
.band-type__label { opacity: 0.55; }

/* ── Zone B ── */
.home-b {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 2fr;
  min-height: 0;
  overflow: hidden;
}

.home-col {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  min-height: 0;
}
.home-col--feed {
  border-right: 1px solid var(--color-border);
  overflow: hidden;
  border-radius: 30px 0px;
}
.home-col--carousels {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

/* Carousels desktop / mobile */
.carousels-desktop {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.carousels-mobile { display: none; }

.carousel-toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.carousel-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}
.carousel-toggle button {
  padding: 0.2rem 0.65rem;
  font-size: 0.7rem;
  background: transparent;
  color: var(--color-text-muted);
  transition: background var(--transition), color var(--transition);
}
.carousel-toggle button.active {
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 600;
}

.col-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(200, 130, 26, 0.15);
  flex-shrink: 0;
}
.col-title {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--color-amber-lt);
  font-weight: 400;
  font-style: italic;
}

.col-loading { display: flex; justify-content: center; padding: 2rem 0; }
.spinner-sm {
  width: 24px; height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.col-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; padding: 2rem 0;
  color: var(--color-text-muted); font-size: 0.85rem; font-style: italic; text-align: center;
}
.btn-amber-sm {
  padding: 0.45rem 1rem; background: var(--color-amber); color: #0d0600;
  font-weight: 600; border-radius: 8px; font-size: 0.82rem; transition: background var(--transition);
}
.btn-amber-sm:hover { background: var(--color-amber-lt); }

/* Feed */
.feed-list {
  overflow-y: auto; flex: 1;
  display: flex; flex-direction: column; gap: 0.75rem;
  scrollbar-width: thin; scrollbar-color: var(--color-border) transparent;
  padding-right: 0.25rem;
}
.feed-list::-webkit-scrollbar { width: 3px; }
.feed-list::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.feed-item {
  display: flex; flex-direction: column; gap: 0.6rem;
  padding: 0.85rem;
  background: rgba(255,255,255,0.03); border: 1px solid var(--color-border);
  border-radius: 10px; flex-shrink: 0; transition: border-color var(--transition);
}
.feed-item:hover { border-color: rgba(200,130,26,0.2); }
.feed-item__author {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.78rem; color: var(--color-text-muted); transition: color var(--transition);
}
.feed-item__author:hover { color: var(--color-amber); }
.feed-item__avatar {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; overflow: hidden;
  border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center;
  background: rgba(200,130,26,0.12); font-size: 0.6rem; font-weight: 600; color: var(--color-amber);
}
.feed-item__avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.feed-item__date { margin-left: auto; font-size: 0.7rem; opacity: 0.5; flex-shrink: 0; }
.feed-item__work { display: flex; gap: 0.65rem; align-items: flex-start; }
.feed-item__cover { width: 36px; height: 52px; flex-shrink: 0; border-radius: 3px; overflow: hidden; }
.feed-item__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.feed-item__cover-ph { width: 100%; height: 100%; }
.feed-item__info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.feed-item__type { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-amber); font-weight: 600; }
.feed-item__title { font-family: var(--font-serif); font-size: 0.88rem; color: var(--color-text); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed-item__desc { font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 0.15rem; }
.feed-item__footer { display: flex; justify-content: flex-end; padding-top: 0.4rem; }
.feed-item__upvote {
  font-size: 0.75rem; color: var(--color-text-muted); background: transparent;
  padding: 0.2rem 0.55rem; border-radius: 20px; border: 1px solid transparent;
  transition: color var(--transition), border-color var(--transition), background var(--transition);
}
.feed-item__upvote:hover { color: var(--color-amber); border-color: rgba(200,130,26,0.3); background: rgba(200,130,26,0.06); }
.feed-item__upvote.active { color: var(--color-amber); }

.home-footer {
  padding: 0.75rem; text-align: center;
  flex-shrink: 0;
  position: relative;
}
.home-footer::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-border) 20%, var(--color-border) 80%, transparent);
}
.home-footer__link { font-size: 0.68rem; color: var(--color-text-muted); opacity: 0.4; transition: opacity var(--transition); }
.home-footer__link:hover { opacity: 1; }
.home-footer__sep { font-size: 0.68rem; color: var(--color-text-muted); opacity: 0.2; margin: 0 0.5rem; }
.home-footer__link--kofi:hover { color: var(--color-amber); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* Mobile */
@media (max-width: 768px) {
  .home-page { height: auto; overflow: auto; padding-bottom: 60px; }
  .home-a { grid-template-columns: 1fr; }
  .home-a__left { border-right: none; }
  .home-a__right { padding: 1.25rem; border-top: 1px solid var(--color-border); }
  .home-hero { padding: 1.5rem 1.25rem; }
  .home-band { padding: 1rem 1.25rem; }
  .home-b { grid-template-columns: 1fr; height: auto; overflow: hidden; width: 100%; }
  .home-col--feed { border-right: none; border-bottom: 1px solid var(--color-border); max-height: 60vh; overflow: hidden; }
  .home-col--carousels { overflow: hidden; width: 100%; min-width: 0; }
  .home-col { padding: 1.25rem 1rem; }
  .carousels-desktop { display: none; }
  .carousels-mobile { display: flex; flex-direction: column; gap: 0.75rem; }
  .home-footer { display: none; }
}
</style>
