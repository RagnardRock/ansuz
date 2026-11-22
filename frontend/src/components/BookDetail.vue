<template>
  <div class="detail-overlay" role="dialog" aria-modal="true" aria-label="Détail de l'œuvre" @click.self="handleOverlayClick">

    <!-- ── Objet fermé (animation d'ouverture) ── -->

    <!-- Livre / Manga -->
    <div v-if="isBook" ref="bookStageRef" class="book3d-stage" @dblclick.stop="skipAnimation">
      <div ref="book3dRef" class="book3d" :class="{ 'book3d--manga': work.type === 'manga' }">
        <div ref="bookFrontRef" class="book3d__front">
          <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
          <div v-else class="book3d__placeholder" :style="{ background: placeholderBg }"><span>{{ work.title }}</span></div>
          <div class="book3d__spine-shadow" />
        </div>
        <div class="book3d__pages" />
      </div>
    </div>

    <!-- Film / Série → DVD -->
    <div v-else-if="work.type === 'film' || work.type === 'series'" ref="dvdStageRef" class="dvd-stage" @dblclick.stop="skipAnimation">
      <div ref="discRef" class="dvd-disc">
        <div class="dvd-disc__label" :style="{ background: placeholderBg }">
          <span>{{ work.title?.substring(0, 1) }}</span>
        </div>
      </div>
      <div class="dvd-case">
        <img v-if="work.cover_url" :src="work.cover_url" class="dvd-case__art" :alt="work.title" />
        <div v-else class="dvd-case__art dvd-case__art--placeholder" :style="{ background: placeholderBg }">
          <span>{{ work.title }}</span>
        </div>
      </div>
    </div>

    <!-- Musique → Vinyle -->
    <div v-else-if="work.type === 'music'" ref="vinylStageRef" class="vinyl-stage" @dblclick.stop="skipAnimation">
      <div class="vinyl-wrap">
        <div ref="sleeveRef" class="vinyl-sleeve">
          <img v-if="work.cover_url" :src="work.cover_url" class="vinyl-sleeve__art" :alt="work.title" />
          <div v-else class="vinyl-sleeve__art vinyl-sleeve__placeholder" :style="{ background: placeholderBg }">
            <span>{{ work.title }}</span>
          </div>
        </div>
        <div ref="discRef" class="vinyl-disc">
          <div class="vinyl-disc__grooves" />
          <div class="vinyl-disc__label" :style="{ background: placeholderBg }">
            <span>{{ work.author?.substring(0, 3)?.toUpperCase() }}</span>
          </div>
          <div class="vinyl-disc__hole" />
        </div>
      </div>
    </div>

    <!-- Jeu → Cartouche NES -->
    <div v-else-if="work.type === 'game'" ref="gameStageRef" class="nes-stage" @dblclick.stop="skipAnimation">
      <div ref="cartRef" class="nes-cart-anim">
        <div class="nes-cart-anim__card">
          <div class="nes-cart-anim__ridges"></div>
          <div class="nes-cart-anim__body">
            <div class="nes-cart-anim__label">
              <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" class="nes-cart-anim__art" />
              <div v-else class="nes-cart-anim__ph" :style="{ background: placeholderBg }"><span>{{ work.title }}</span></div>
            </div>
            <div class="nes-cart-anim__side-left"></div>
          </div>
          <div class="nes-cart-anim__stub-face"></div>
          <div class="nes-cart-anim__back"></div>
        </div>
      </div>
      <div ref="slotRef" class="console-slot">
        <div class="console-slot__lip" />
        <div class="console-slot__opening" />
      </div>
    </div>

    <!-- ── Fiche ouverte ── -->
    <div ref="openRef" class="work-sheet" style="display: none" :class="{ 'work-sheet--manga': work.type === 'manga' }">
      <!-- Sidebar : artwork + stats (à droite pour les mangas) -->
      <div ref="wsSidebarRef" class="ws__sidebar">
        <div class="ws__artwork-wrap">
          <img v-if="work.cover_url" ref="coverImgRef" :src="work.cover_url" :alt="work.title"
            class="ws__artwork" :class="{ loaded: coverLoaded }" @load="coverLoaded = true" />
          <div v-else class="ws__artwork ws__artwork--placeholder" :style="{ background: placeholderBg }">
            <span>{{ work.title }}</span>
          </div>
        </div>
        <div class="ws__rating-block" v-if="avgRating">
          <StarDisplay :rating="avgRating" size="lg" />
          <span class="ws__rating-val">{{ avgRating }}/5</span>
          <span class="ws__review-count">{{ reviewCount }} avis</span>
        </div>
        <span v-else class="ws__no-rating">Aucun avis</span>
        <a v-if="work.link" :href="work.link" target="_blank" rel="noopener" class="ws__link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Voir l'œuvre
        </a>
      </div>

      <!-- Main : info + avis -->
      <div ref="wsMainRef" class="ws__main">
        <div class="ws__page-inner">
          <!-- En-tête -->
          <div class="ws__header">
            <span class="ws__type-badge">{{ typeName }}</span>
            <h2 class="ws__title">{{ work.title }}</h2>
            <p v-if="work.author" class="ws__author">{{ authorLabel }} : <strong>{{ work.author }}</strong></p>
          </div>

          <!-- Mon suivi : statut + progression -->
          <SuiviOeuvre v-if="auth.isLoggedIn && !loadingReviews" :work="work" :initial="myLibrary" />

          <!-- Métadonnées par type -->
          <div class="ws__meta">
            <!-- Faits clés (chips) -->
            <div class="ws__facts">
              <span v-if="work.release_year" class="ws__fact">{{ work.release_year }}</span>
              <span v-if="work.duration" class="ws__fact">{{ durationLabel }}</span>
              <span v-if="work.page_count" class="ws__fact">{{ work.page_count }} p.</span>
              <span v-if="work.season_count" class="ws__fact">{{ work.season_count }} saison{{ work.season_count > 1 ? 's' : '' }}</span>
              <span v-if="work.volume_count" class="ws__fact">{{ work.volume_count }} vol.</span>
              <span v-if="work.track_count" class="ws__fact">{{ work.track_count }} pistes</span>
              <span v-if="work.status" class="ws__fact ws__fact--status">{{ statusLabel }}</span>
              <span v-if="work.language" class="ws__fact">{{ work.language.toUpperCase() }}</span>
              <span v-if="work.origin" class="ws__fact">{{ originLabel }}</span>
            </div>

            <!-- Genres -->
            <div v-if="work.genres?.length" class="ws__genres">
              <span v-for="g in work.genres" :key="g" class="ws__genre">{{ g }}</span>
            </div>

            <!-- Synopsis -->
            <p v-if="synopsis" class="ws__synopsis">{{ synopsis }}</p>

            <!-- Casting (film/série) -->
            <div v-if="work.main_cast?.length" class="ws__cast">
              <span class="ws__meta-label">Avec</span>
              <span class="ws__cast-list">{{ work.main_cast.join(', ') }}</span>
            </div>

            <!-- Plateformes (jeu) -->
            <div v-if="work.platforms?.length" class="ws__platforms">
              <span v-for="p in work.platforms" :key="p" class="ws__platform">{{ p }}</span>
            </div>

            <!-- Infos livre -->
            <div v-if="work.type === 'book'" class="ws__extra-row">
              <span v-if="work.publisher" class="ws__extra"><span class="ws__meta-label">Éditeur</span> {{ work.publisher }}</span>
              <span v-if="work.isbn" class="ws__extra"><span class="ws__meta-label">ISBN</span> {{ work.isbn }}</span>
            </div>

            <!-- Infos jeu -->
            <div v-if="work.type === 'game' && work.publisher" class="ws__extra-row">
              <span class="ws__extra"><span class="ws__meta-label">Éditeur</span> {{ work.publisher }}</span>
            </div>
          </div>

          <!-- Avis -->
          <div class="ws__reviews-section">
            <div v-if="loadingReviews" class="ws__loading"><span class="spinner-sm" /></div>
            <template v-else>
              <div v-for="review in reviews" :key="review.id" class="ws__review">
                <div class="ws__review-header">
                  <router-link :to="{ name: 'profile', params: { username: review.username } }"
                    class="ws__review-author" @click.stop>{{ review.username }}</router-link>
                  <span v-if="review.from_following" class="ws__following-badge">Suivi</span>
                  <StarDisplay v-if="review.rating" :rating="review.rating" size="sm" />
                </div>
                <p v-if="review.description" class="ws__review-desc">{{ review.description }}</p>
                <div class="ws__review-footer">
                  <button class="ws__upvote" :class="{ active: review.user_upvoted }"
                    :aria-label="`${review.user_upvoted ? 'Retirer le like' : 'Liker'} l'avis de ${review.username} (${review.upvote_count})`"
                    :aria-pressed="review.user_upvoted"
                    :disabled="!auth.isLoggedIn || review.user_id === auth.user?.id" @click="toggleUpvote(review)">
                    ♥ {{ review.upvote_count }}
                  </button>
                  <div v-if="isOwnReview(review) || auth.user?.is_admin" class="ws__review-actions">
                    <button v-if="isOwnReview(review)" class="ws__btn-edit" @click="openEditReview(review)">Modifier</button>
                    <button class="ws__btn-delete" @click="confirmDeleteReview(review)">Supprimer</button>
                  </div>
                </div>
              </div>
              <p v-if="reviews.length === 0" class="ws__no-reviews">Soyez le premier à laisser un avis.</p>
            </template>
          </div>

          <!-- Footer -->
          <div class="ws__footer">
            <button v-if="auth.isLoggedIn && !myReview" class="ws__add-review" @click="showReviewModal = true">
              + Donner mon avis
            </button>
            <span v-else-if="auth.isLoggedIn && myReview" class="ws__reviewed-badge">Avis publié ✓</span>
            <div class="ws__footer-right">
              <p v-if="formattedDate" class="ws__date">Ajouté le {{ formattedDate }}</p>
              <button v-if="auth.user?.is_admin" class="ws__btn-delete-work" @click="confirmDeleteWork">
                Supprimer l'œuvre
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="detail-close" aria-label="Fermer" @click="$emit('close')">✕</button>

    <Teleport to="body">
      <Transition name="modal">
        <ReviewModal v-if="showReviewModal" :work-id="work.id" :review="editingReview"
          @close="closeReviewModal" @saved="onReviewSaved" />
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { nettoyerTexte } from '@/utils/texte.js'
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth.js'
import { useWorksStore } from '@/stores/works.js'
import { worksApi, reviewsApi } from '@/api/index.js'
import { useAnimationPref } from '@/composables/useAnimationPref.js'
import StarDisplay from './StarDisplay.vue'
import ReviewModal from './ReviewModal.vue'
import SuiviOeuvre from './SuiviOeuvre.vue'

const props = defineProps({ work: { type: Object, required: true } })
const emit = defineEmits(['close', 'workDeleted'])

const auth = useAuthStore()
const worksStore = useWorksStore()

const bookStageRef = ref(null)
const dvdStageRef = ref(null)
const vinylStageRef = ref(null)
const gameStageRef = ref(null)
const book3dRef = ref(null)
const bookFrontRef = ref(null)
const mediaObjectRef = ref(null)
const cartRef = ref(null)
const slotRef = ref(null)
const discRef = ref(null)
const sleeveRef = ref(null)
const lidRef = ref(null)
const openRef = ref(null)
const wsSidebarRef = ref(null)
const wsMainRef = ref(null)
const coverImgRef = ref(null)
const coverLoaded = ref(false)
const isMobile = window.innerWidth < 768
const { animationsEnabled, consumeSkip, skipNext } = useAnimationPref()
let activeTimeline = null
const openedAt = Date.now()

function handleOverlayClick() {
  if (Date.now() - openedAt < 250) return
  emit('close')
}

function skipAnimation() {
  if (!activeTimeline) return
  activeTimeline.kill()
  activeTimeline = null
  const stage = bookStageRef.value ?? dvdStageRef.value ?? vinylStageRef.value ?? gameStageRef.value
  if (stage) gsap.set(stage, { display: 'none' })
  gsap.set(openRef.value, { display: 'flex', opacity: 1, y: 0 })
}

watch(skipNext, (val) => {
  if (val) {
    consumeSkip()
    skipAnimation()
  }
})

const reviews = ref([])
const myLibrary = ref(null)
const loadingReviews = ref(true)
const showReviewModal = ref(false)
const editingReview = ref(null)
const avgRating = ref(props.work.avg_rating)
const reviewCount = ref(props.work.review_count ?? 0)
const myReview = computed(() => reviews.value.find((r) => r.user_id === auth.user?.id) ?? null)

const isBook = computed(() => props.work.type === 'book' || props.work.type === 'manga')

const TYPE_NAMES = { book: 'Livre', manga: 'Manga', film: 'Film', series: 'Série', music: 'Album', game: 'Jeu vidéo' }
const typeName = computed(() => TYPE_NAMES[props.work.type] ?? props.work.type)

const AUTHOR_LABELS = { book: 'Auteur', manga: 'Mangaka', film: 'Réalisateur', series: 'Créateur', music: 'Artiste', game: 'Studio' }
const authorLabel = computed(() => AUTHOR_LABELS[props.work.type] ?? 'Auteur')

const durationLabel = computed(() => {
  const d = props.work.duration
  if (!d) return null
  if (props.work.type === 'series') return `${d} min/ép.`
  const h = Math.floor(d / 60)
  const m = d % 60
  return h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m} min`
})

const statusLabel = computed(() => {
  const map = {
    FINISHED: 'Terminé', RELEASING: 'En cours', HIATUS: 'En pause',
    Ended: 'Terminée', 'Returning Series': 'En cours', Canceled: 'Annulée',
  }
  return map[props.work.status] ?? props.work.status
})

const originLabel = computed(() => {
  const map = { JP: 'Manga', KR: 'Manhwa', CN: 'Manhua' }
  return map[props.work.origin] ?? props.work.origin
})

// Les vignettes (Découverte, Tendances…) n'ont pas toujours la date : on prend celle de la fiche complète.
const createdAt = ref(props.work.created_at ?? null)
const formattedDate = computed(() => {
  const d = new Date(createdAt.value)
  return createdAt.value && !isNaN(d) ? d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : null
})

// Certains résumés importés (AniList) contiennent encore des balises HTML.
const synopsis = computed(() => nettoyerTexte(props.work.description))

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}
const hue = computed(() => titleHash(props.work.title) % 360)
const placeholderBg = computed(() =>
  `linear-gradient(145deg, hsl(${hue.value}, 40%, 22%), hsl(${hue.value}, 35%, 14%))`
)

function isOwnReview(review) { return review.user_id === auth.user?.id }

async function fetchReviews() {
  loadingReviews.value = true
  try {
    const { data } = await worksApi.getOne(props.work.id)
    reviews.value = data.reviews ?? []
    myLibrary.value = data.my_library ?? null
    if (data.created_at) createdAt.value = data.created_at
    avgRating.value = data.avg_rating
    reviewCount.value = data.review_count ?? 0
  } catch {
    // Avis non chargés : la fiche reste affichée sans eux.
  } finally { loadingReviews.value = false }
}

async function toggleUpvote(review) {
  if (!auth.isLoggedIn) return
  const data = await worksStore.upvoteReview(review.id)
  review.user_upvoted = data.upvoted
  review.upvote_count = data.upvote_count
}

function openEditReview(review) { editingReview.value = review; showReviewModal.value = true }
function closeReviewModal() { showReviewModal.value = false; editingReview.value = null }

function onReviewSaved(savedReview) {
  const idx = reviews.value.findIndex((r) => r.id === savedReview.id)
  if (idx !== -1) reviews.value[idx] = savedReview
  else reviews.value.unshift(savedReview)
  worksStore.refreshWork(props.work.id)
  closeReviewModal()
  fetchReviews()
}

async function confirmDeleteReview(review) {
  if (!confirm('Supprimer cet avis ?')) return
  await reviewsApi.remove(review.id)
  reviews.value = reviews.value.filter((r) => r.id !== review.id)
  worksStore.refreshWork(props.work.id)
  fetchReviews()
}

async function confirmDeleteWork() {
  if (!confirm(`Supprimer définitivement "${props.work.title}" ?`)) return
  await worksStore.deleteWork(props.work.id)
  emit('workDeleted')
  emit('close')
}

// ── Animations ────────────────────────────────────────────────────────────────

function showOpen() {
  gsap.set(openRef.value, { display: 'flex', opacity: 0 })
  gsap.to(openRef.value, { opacity: 1, duration: 0.3, ease: 'power2.out' })
}

async function animateBook() {
  const bookStage = bookStageRef.value
  const book3d = book3dRef.value
  const isManga = props.work.type === 'manga'
  gsap.set(bookStage, { opacity: 0, y: 60, scale: 0.7 })
  gsap.set(book3d, { rotateY: isManga ? 25 : -25, rotateX: 2 })
  gsap.set(openRef.value, { display: 'none', opacity: 0 })

  await new Promise((r) => setTimeout(r, 120))

  activeTimeline = gsap.timeline(); await activeTimeline
    // Phase 1 : livre fermé apparaît
    .to(bookStage, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' })
    // Phase 2 : livre se referme sur la tranche (miroir pour manga)
    .to(book3d, { rotateY: isManga ? 90 : -90, rotateX: 0, duration: 0.45, ease: 'power2.in' }, '+=0.05')
    .to(bookStage, { opacity: 0, duration: 0.05 })
    .set(bookStage, { display: 'none' })
    // Phase 3 : fiche s'ouvre comme un livre (deux moitiés pivotent)
    // Manga : sens miroir (tranche à droite)
    .set(openRef.value, { display: 'flex', opacity: 1 })
    .set(wsSidebarRef.value, {
      rotateY: props.work.type === 'manga' ? -90 : 90,
      transformPerspective: 1200,
      transformOrigin: props.work.type === 'manga' ? 'left center' : 'right center',
    })
    .set(wsMainRef.value, {
      rotateY: props.work.type === 'manga' ? 90 : -90,
      transformPerspective: 1200,
      transformOrigin: props.work.type === 'manga' ? 'right center' : 'left center',
    })
    .to(wsSidebarRef.value, { rotateY: 0, duration: 0.7, ease: 'power3.out' })
    .to(wsMainRef.value, { rotateY: 0, duration: 0.7, ease: 'power3.out' }, '<')
}

async function animateDVD() {
  const stage = dvdStageRef.value
  const disc = discRef.value

  // Disc starts hidden behind the case
  gsap.set(stage, { opacity: 0, y: 50, scale: 0.8 })
  gsap.set(disc, { x: 0, y: 0, rotation: 0, opacity: 0 })
  gsap.set(openRef.value, { display: 'none', opacity: 0 })

  await new Promise((r) => setTimeout(r, 100))

  activeTimeline = gsap.timeline(); await activeTimeline
    // Boîtier apparaît
    .to(stage, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.2)' })
    .to(disc, { opacity: 1, x: 100, rotation: 540, duration: .75, ease: 'power2.inOut' }, '-=0.05')
    .to(disc, { rotation: 660, duration: 0.3, ease: 'power1.out' })
    // Tout disparaît
    .to(stage, { opacity: 0, scale: 0.95, duration: 0.3 })
    .to(disc, { opacity: 0, scale: 0.8, duration: 0.3 }, '<')
    .set(stage, { display: 'none' })
    .set(openRef.value, { display: 'flex', opacity: 0, scale: 0.96 })
    .to(openRef.value, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' })
}


async function animateVinyl() {
  const stage = vinylStageRef.value
  const sleeve = sleeveRef.value
  const disc = discRef.value

  gsap.set(stage, { opacity: 0, scale: 0.75 })
  gsap.set(disc, { x: 0, rotation: 0 })
  gsap.set(openRef.value, { display: 'none', opacity: 0 })

  await new Promise((r) => setTimeout(r, 100))

  activeTimeline = gsap.timeline(); await activeTimeline
    .to(stage, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' })
    .to(disc, { x: 90, rotation: 540, duration: 0.9, ease: 'power2.inOut' }, '+=0.05')
    .to(sleeve, { opacity: 0.3, duration: 0.3 }, '-=0.4')
    .to(stage, { opacity: 0, duration: 0.25 })
    .set(stage, { display: 'none' })
    .set(openRef.value, { display: 'flex' })
    .to(openRef.value, { opacity: 1, duration: 0.35, ease: 'power2.out' })
}

async function animateGameCart() {
  const stage = gameStageRef.value
  const cart = cartRef.value
  const slot = slotRef.value
  if (!stage || !cart || !slot) { await animateSimple(); return }

  gsap.set(stage, { opacity: 1 })
  gsap.set(cart, { y: -20, opacity: 1, rotationY: -90, transformPerspective: 900 })
  gsap.set(slot, { opacity: 1, y: 0 })
  gsap.set(openRef.value, { display: 'none', opacity: 0 })

  await new Promise((r) => setTimeout(r, 80))

  activeTimeline = gsap.timeline(); await activeTimeline
    // Apparaît de chant (tranche visible), descend et pivote face caméra
    .to(cart, { y: 0, rotationY: 0.1, duration: 0.8, ease: 'power2.out' })
    // Cartouche s'insère
    .to(cart, { y: 22, rotationY: 0.1, duration: 0.35, ease: 'power2.in' }, '+=0.1')
    // Tout disparaît
    .to(stage, { opacity: 0, duration: 0.25 }, '+=0.05')
    .set(stage, { display: 'none' })
    .set(openRef.value, { display: 'flex', opacity: 0 })
    .to(openRef.value, { opacity: 1, duration: 0.35, ease: 'power2.out' })
}

async function animateSimple() {
  gsap.set(openRef.value, { display: 'flex', opacity: 0, y: 30 })
  gsap.to(openRef.value, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
}

onMounted(async () => {
  await nextTick()
  if (coverImgRef.value?.complete) coverLoaded.value = true
  fetchReviews()

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const skipAnim = consumeSkip()

  if (isMobile || reducedMotion || !animationsEnabled.value || skipAnim) {
    const activeStage = bookStageRef.value ?? dvdStageRef.value ?? vinylStageRef.value ?? gameStageRef.value
    if (activeStage) gsap.set(activeStage, { display: 'none' })
    if (!reducedMotion) {
      gsap.fromTo(openRef.value, { display: 'flex', y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })
    } else {
      gsap.set(openRef.value, { display: 'flex', opacity: 1 })
    }
    return
  }

  if (isBook.value) await animateBook()
  else if (props.work.type === 'film' || props.work.type === 'series') await animateDVD()
  else if (props.work.type === 'music') await animateVinyl()
  else if (props.work.type === 'game') await animateGameCart()
  else await animateSimple()
})
</script>

<style scoped>
/* ── Overlay ── */
.detail-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0, 0, 0, 0.88);
  display: flex; align-items: center; justify-content: center;
  padding: 2rem; perspective: 2000px;
}

/* ── Bouton fermer ── */
.detail-close {
  position: fixed; top: 1.5rem; right: 1.5rem;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(20,10,4,0.9); border: 1px solid var(--color-border);
  color: var(--color-text); font-size: 0.95rem; display: flex;
  align-items: center; justify-content: center; z-index: 200;
  transition: background var(--transition);
}
.detail-close:hover { background: var(--color-amber); color: #0d0600; }

/* ══════════════════════════════════════════════════
   OBJETS FERMÉS
══════════════════════════════════════════════════ */

/* ── Livre ── */
.book3d-stage { display: flex; align-items: center; justify-content: center; }
.book3d {
  --bw: 220px; --bh: 315px; --bt: 40px;
  position: relative; width: var(--bw); height: var(--bh);
  transform-style: preserve-3d;
}
.book3d__front {
  position: absolute; inset: 0;
  transform: translateZ(calc(var(--bt) / 2));
  border-radius: 2px 6px 6px 2px; overflow: hidden;
  box-shadow: 0 20px 70px rgba(0,0,0,0.9);
}
.book3d__front img { width: 100%; height: 100%; object-fit: cover; display: block; }
.book3d__spine-shadow {
  position: absolute; inset: 0;
  background: linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 9%, transparent 22%);
  pointer-events: none;
}
.book3d--manga .book3d__spine-shadow {
  background: linear-gradient(to left, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 9%, transparent 22%);
}
.book3d__placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 1.5rem; text-align: center; font-family: var(--font-serif);
  font-style: italic; font-size: 1.1rem; color: rgba(255,220,170,0.85);
}
.book3d__pages {
  position: absolute; top: 3px; left: var(--bw); width: var(--bt);
  height: calc(100% - 6px); transform-origin: left center;
  transform: translateZ(calc(var(--bt) / 2)) rotateY(90deg);
  background: repeating-linear-gradient(to bottom, #f4ead6 0, #f4ead6 2px, #e6d4b0 2px, #e6d4b0 3px);
  border-radius: 0 2px 2px 0;
}
.book3d--manga .book3d__pages {
  left: auto; right: var(--bw);
  transform-origin: right center;
  transform: translateZ(calc(var(--bt) / 2)) rotateY(-90deg);
  border-radius: 2px 0 0 2px;
}

/* ── DVD ── */
.dvd-stage {
  display: flex; align-items: center; justify-content: center;
  position: relative; width: 260px; height: 320px;
}
.dvd-case {
  width: 185px; height: 265px; position: absolute;
  border-radius: 4px 8px 8px 4px;
  box-shadow: -6px 0 16px rgba(0,0,0,0.5), 0 30px 80px rgba(0,0,0,0.7);
  overflow: hidden; z-index: 2;
}
.dvd-case__art {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.dvd-case__art--placeholder {
  height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 1.5rem; text-align: center; font-family: var(--font-serif);
  font-style: italic; font-size: 1rem; color: rgba(255,220,170,0.85);
}
/* Disque derrière le boîtier */
.dvd-disc {
  width: 160px; height: 160px; border-radius: 50%;
  position: absolute; top: 80px; left: 50px; z-index: 1;
  background: conic-gradient(#c8c8d8, #a0a0b8, #e8e8f0, #c8c8d8, #a0a0b8, #e8e8f0, #c8c8d8);
  box-shadow: 0 0 20px rgba(180,180,255,0.4), 0 8px 30px rgba(0,0,0,0.6);
}
.dvd-disc__label {
  position: absolute; inset: 22%; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.85);
}
.dvd-disc::after {
  content: ''; position: absolute; inset: 42%; border-radius: 50%;
  background: rgba(0,0,0,0.75);
}


/* ── Vinyle ── */
.vinyl-stage { display: flex; align-items: center; justify-content: center; }
.vinyl-wrap { position: relative; width: 200px; height: 200px; }
.vinyl-sleeve {
  width: 180px; height: 180px; position: absolute; top: 10px; left: 0;
  border-radius: 3px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  z-index: 2;
}
.vinyl-sleeve__art { width: 100%; height: 100%; object-fit: cover; display: block; }
.vinyl-sleeve__placeholder {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 1rem; font-family: var(--font-serif); font-style: italic;
  font-size: 0.85rem; color: rgba(255,220,170,0.85); text-align: center;
}
.vinyl-disc {
  width: 170px; height: 170px; border-radius: 50%; position: absolute; top: 15px; left: 10px;
  background: repeating-radial-gradient(circle, #111 0, #111 2px, #1a1a1a 2px, #1a1a1a 4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1;
}
.vinyl-disc__grooves {
  position: absolute; inset: 0; border-radius: 50%;
  background: repeating-radial-gradient(circle, transparent 0, transparent 6px, rgba(255,255,255,0.03) 6px, rgba(255,255,255,0.03) 7px);
}
.vinyl-disc__label {
  width: 60px; height: 60px; border-radius: 50%; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.8);
  letter-spacing: 0.05em;
}
.vinyl-disc__hole {
  position: absolute; width: 10px; height: 10px; border-radius: 50%;
  background: #0a0a0a; z-index: 2;
}

/* ── Cartouche NES ── */
.nes-stage {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 0;
}
.nes-cart-anim {
  display: flex; flex-direction: column; align-items: center;
  transform-style: preserve-3d;
}
.nes-cart-anim__card {
  width: 160px; height: 192px; /* 160 corps + 32 stub */
  position: relative;
  transform-style: preserve-3d;
}
.nes-cart-anim__body {
  position: absolute;
  left: 0; right: 0; top: 0; height: 160px;
  background: #a8a8a8;
  border-radius: 3px 3px 1px 1px;
  backface-visibility: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  transform-style: preserve-3d;
  transform: translateZ(11px);
}
/* Stub intégré dans la card */
.nes-cart-anim__stub-face {
  position: absolute;
  left: 20px; right: 20px;
  top: 160px; height: 32px;
  background: #909090;
  border-radius: 0 0 3px 3px;
  backface-visibility: hidden;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.4);
  transform: translateZ(11px);
  transform-style: preserve-3d;
}
.nes-cart-anim__stub-face::after {
  content: '';
  position: absolute;
  top: 0; left: 100%;
  width: 22px; height: 100%;
  background: linear-gradient(to right, #888, #707070);
  transform-origin: left center;
  transform: rotateY(90deg);
  border-radius: 0 0 3px 0;
}
.nes-cart-anim__stub-face::before {
  content: '';
  position: absolute;
  top: 0; right: 100%;
  width: 22px; height: 100%;
  background: linear-gradient(to left, #888, #707070);
  transform-origin: right center;
  transform: rotateY(-90deg);
  border-radius: 0 0 0 3px;
}
/* Rainures front */
.nes-cart-anim__ridges {
  position: absolute;
  left: 11px; width: 20%;
  top: 0; height: calc(160px * 1.2);
  background: repeating-linear-gradient(to right, #8a8a8a 0px, #8a8a8a 3px, #bcbcbc 3px, #bcbcbc 7px);
  border-radius: 3px 0 0 1px;
  backface-visibility: hidden;
  z-index: 3;
  transform: translateZ(11px);
}
/* Face latérale droite */
.nes-cart-anim__body::after {
  content: '';
  position: absolute;
  top: 0; left: 100%;
  width: 22px; height: 100%;
  background: linear-gradient(to right, #888, #707070);
  transform-origin: left center;
  transform: rotateY(90deg);
  border-radius: 0 3px 3px 0;
  backface-visibility: hidden;
}
/* Face latérale gauche */
.nes-cart-anim__side-left {
  position: absolute;
  top: 0; right: 100%;
  width: 22px; height: 100%;
  background: linear-gradient(to left, #888, #707070);
  transform-origin: right center;
  transform: rotateY(-90deg);
  border-radius: 3px 0 0 3px;
}
/* Face arrière — même forme que le front (corps + stub rétréci) */
.nes-cart-anim__back {
  position: absolute; inset: 0;
  background: #a0a0a0;
  backface-visibility: hidden;
  transform: translateZ(-11px) rotateY(180deg);
  clip-path: polygon(
    0 0, 100% 0,
    100% 160px, calc(100% - 20px) 160px,
    calc(100% - 20px) 100%, 20px 100%,
    20px 160px, 0 160px
  );
}
/* Plus de stub séparé */
.nes-cart-anim__stub { display: none; }
.nes-cart-anim__label {
  position: absolute;
  left: 28%; right: 3%; top: 4%; bottom: 4%;
  border-radius: 2px; overflow: hidden; background: #111; z-index: 1;
}
.nes-cart-anim__art { width: 100%; height: 100%; object-fit: cover; display: block; }
.nes-cart-anim__ph {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  padding: 1rem; font-family: var(--font-serif); font-style: italic;
  font-size: 0.9rem; color: rgba(255,220,170,0.85); text-align: center;
}
.nes-cart-anim__stub {
  width: 88%; height: 32px;
  background: #909090;
  border-radius: 0 0 3px 3px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.4);
  z-index: 1;
}
/* Fente de console */
.console-slot {
  width: 200px; display: flex; flex-direction: column; align-items: center;
}
.console-slot__lip {
  width: 200px; height: 14px;
  background: linear-gradient(to bottom, #1a1a22, #111118);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.5);
}
.console-slot__opening {
  width: 172px; height: 10px;
  background: #080810;
  border-radius: 0 0 3px 3px;
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.9);
  overflow: hidden;
}

/* ══════════════════════════════════════════════════
   FICHE OUVERTE
══════════════════════════════════════════════════ */
.work-sheet {
  display: none;
  max-width: 920px; width: 100%;
  height: min(600px, 82vh);
  border-radius: 12px;
  box-shadow: 0 40px 120px rgba(0,0,0,0.95);
  overflow: hidden;
    background: #faf3e3;

}

.ws__sidebar {
  flex: 0 0 200px;
  background: #f0e6cc;
  border-right: 1px solid rgba(180,140,80,0.25);
  display: flex; flex-direction: column;
  align-items: center; gap: 1rem;
  padding: 1.5rem 1rem;
  overflow: hidden;
}
/* Manga : sidebar à droite, contenu à gauche */
.work-sheet--manga { flex-direction: row-reverse; }
.work-sheet--manga .ws__sidebar {
  border-right: none;
  border-left: 1px solid rgba(180,140,80,0.25);
}

.ws__artwork-wrap {
  width: 140px;
  border-radius: 4px; overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  flex-shrink: 0;
}
.ws__artwork {
  width: 100%; display: block;
  object-fit: cover;
  opacity: 0; transition: opacity 0.4s;
}
.ws__artwork.loaded { opacity: 1; }
.ws__artwork--placeholder {
  height: 200px;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; font-family: var(--font-serif); font-style: italic;
  font-size: 0.85rem; color: rgba(255,220,170,0.85); text-align: center;
}

.ws__rating-block { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.ws__rating-val { font-family: var(--font-serif); font-size: 1.1rem; color: #3d2510; }
.ws__review-count { font-size: 0.72rem; color: #8a6a40; }
.ws__no-rating { font-size: 0.78rem; color: #8a6a40; font-style: italic; text-align: center; }

.ws__link {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.75rem; color: #c8821a; transition: opacity 0.2s;
  text-decoration: none;
}
.ws__link:hover { opacity: 0.7; }

/* Main */
.ws__main {
  flex: 1; min-height: 0; overflow: hidden;
  position: relative;
}
.ws__main::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(180,150,100,0.12) 27px, rgba(180,150,100,0.12) 28px);
  pointer-events: none; z-index: 0;
}
.ws__main::after {
  content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 28px;
  background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
  pointer-events: none; z-index: 0;
}

.ws__page-inner {
  position: relative; z-index: 1;
  height: 100%; overflow-y: auto;
  padding: 1.5rem 1.8rem;
  display: flex; flex-direction: column; gap: 1rem;
  scrollbar-width: thin; scrollbar-color: rgba(180,140,80,0.2) transparent;
}

/* Header */
.ws__header { display: flex; flex-direction: column; gap: 0.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(180,140,80,0.2); }
.ws__type-badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8a6a40; font-weight: 600; }
.ws__title { font-family: var(--font-serif); font-size: 1.5rem; color: #2a1a08; line-height: 1.2; }
.ws__author { font-size: 0.82rem; color: #5c3a1e; }
.ws__author strong { color: #3d2510; }

/* Méta */
.ws__meta { display: flex; flex-direction: column; gap: 0.6rem; }
.ws__facts { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.ws__fact {
  font-size: 0.72rem; padding: 0.2rem 0.55rem;
  background: rgba(180,140,80,0.12); border: 1px solid rgba(180,140,80,0.2);
  border-radius: 20px; color: #5c3a1e;
}
.ws__fact--status { border-color: rgba(200,130,26,0.35); color: #a06020; }
.ws__genres { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.ws__genre {
  font-size: 0.7rem; padding: 0.15rem 0.5rem;
  background: rgba(200,130,26,0.1); border: 1px solid rgba(200,130,26,0.25);
  border-radius: 4px; color: #8a5020;
}
.ws__synopsis { white-space: pre-line; font-size: 0.82rem; color: #5c3a1e; line-height: 1.65; font-style: italic; }
.ws__cast { font-size: 0.8rem; color: #5c3a1e; }
.ws__meta-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: #8a6a40; font-weight: 600; margin-right: 0.35rem; }
.ws__cast-list { color: #3d2510; }
.ws__platforms { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.ws__platform { font-size: 0.7rem; padding: 0.15rem 0.5rem; background: rgba(60,40,20,0.08); border: 1px solid rgba(60,40,20,0.15); border-radius: 4px; color: #5c3a1e; }
.ws__extra-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.ws__extra { font-size: 0.78rem; color: #5c3a1e; }

/* Avis */
.ws__reviews-section { display: flex; flex-direction: column; gap: 0.7rem; }
.ws__loading { display: flex; justify-content: center; padding: 1.5rem; }
.ws__review {
  background: rgba(180,140,80,0.07); border: 1px solid rgba(180,140,80,0.18);
  border-radius: 8px; padding: 0.75rem 0.9rem;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.ws__review-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.ws__review-author { font-size: 0.82rem; color: #3d2510; font-weight: 600; transition: color 0.2s; }
.ws__review-author:hover { color: #c8821a; }
.ws__following-badge {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: #c8821a; border: 1px solid rgba(200,130,26,0.4); border-radius: 4px;
  padding: 0.1rem 0.35rem; font-weight: 600;
}
.ws__review-desc { font-size: 0.82rem; color: #5c3a1e; line-height: 1.6; font-style: italic; }
.ws__review-footer { display: flex; align-items: center; justify-content: space-between; }
.ws__upvote {
  font-size: 0.75rem; color: #8a6a40; background: transparent;
  padding: 0.2rem 0.55rem; border: 1px solid #d4b896; border-radius: 20px;
  transition: all 0.2s; cursor: pointer;
}
.ws__upvote:hover:not(:disabled) { border-color: #c8821a; color: #c8821a; }
.ws__upvote.active { background: rgba(200,130,26,0.12); border-color: #c8821a; color: #c8821a; }
.ws__upvote:disabled { cursor: default; opacity: 0.6; }
.ws__review-actions { display: flex; gap: 0.6rem; }
.ws__btn-edit { font-size: 0.72rem; color: #c8821a; background: transparent; text-decoration: underline; opacity: 0.7; transition: opacity 0.2s; }
.ws__btn-edit:hover { opacity: 1; }
.ws__btn-delete { font-size: 0.72rem; color: #e05050; background: transparent; text-decoration: underline; opacity: 0.7; transition: opacity 0.2s; }
.ws__btn-delete:hover { opacity: 1; }
.ws__no-reviews { font-size: 0.82rem; color: #a08060; font-style: italic; text-align: center; padding: 0.75rem 0; }

/* Footer */
.ws__footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(180,140,80,0.2); padding-top: 0.75rem; margin-top: auto; gap: 0.75rem; flex-wrap: wrap; }
.ws__footer-right { display: flex; align-items: center; gap: 1rem; margin-left: auto; }
.ws__add-review { padding: 0.45rem 0.9rem; background: var(--color-amber); color: #0d0600; font-weight: 600; font-size: 0.8rem; border-radius: 8px; transition: background 0.2s; }
.ws__add-review:hover { background: var(--color-amber-lt); }
.ws__reviewed-badge { font-size: 0.78rem; color: #8a6a40; font-style: italic; }
.ws__date { font-size: 0.68rem; color: #a08060; }
.ws__btn-delete-work { font-size: 0.72rem; color: #e05050; background: transparent; text-decoration: underline; opacity: 0.6; transition: opacity 0.2s; }
.ws__btn-delete-work:hover { opacity: 1; }

/* Spinner */
.spinner-sm { display: inline-block; width: 20px; height: 20px; border: 2px solid rgba(180,140,80,0.3); border-top-color: #c8821a; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .detail-overlay { padding: 0; align-items: flex-end; }
  .work-sheet { flex-direction: column; max-width: 100%; width: 100%; height: 92vh; border-radius: 20px 20px 0 0; }
  .ws__sidebar { flex-direction: row; flex: none; padding: 1rem; gap: 1rem; border-right: none; border-bottom: 1px solid rgba(180,140,80,0.2); }
  .ws__artwork-wrap { width: 70px; }
  .ws__rating-block { flex-direction: row; align-items: center; }
  .ws__main { flex: 1; }
  .ws__page-inner { padding: 1rem 1.2rem; }
  .ws__title { font-size: 1.2rem; }
  .detail-close { top: 0.75rem; right: 0.75rem; width: 32px; height: 32px; font-size: 0.8rem; }
}
</style>
