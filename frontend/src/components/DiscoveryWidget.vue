<template>
  <section class="discovery">
    <div class="discovery__header">
      <h2 class="discovery__title">Découverte</h2>
      <div class="discovery__filters">
        <button
          v-for="t in TYPES"
          :key="t.value"
          class="discovery__pill"
          :class="{ active: selectedTypes.includes(t.value) }"
          @click="toggleType(t.value)"
        >{{ t.label }}</button>
      </div>
      <button class="discovery__refresh" @click="fetchRandom" :disabled="loading" title="Nouvelle découverte">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="discovery__loading"><span class="spinner-sm" /></div>

    <div v-else-if="work" class="discovery__card" @click="handleClick" @dblclick.stop.prevent="handleDblClick">
      <div class="discovery__cover">
        <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
        <div v-else class="discovery__cover-ph" :style="{ background: placeholderBg }" />
      </div>
      <div class="discovery__info">
        <div class="discovery__meta-top">
          <span class="discovery__type">{{ TYPE_NAMES[work.type] ?? work.type }}</span>
          <div v-if="work.avg_rating" class="discovery__rating">
            <StarDisplay :rating="work.avg_rating" size="sm" />
            <span>{{ work.avg_rating }}</span>
          </div>
        </div>
        <h3 class="discovery__work-title">{{ work.title }}</h3>
        <p v-if="work.author" class="discovery__author">{{ work.author }}</p>
        <div v-if="work.genres?.length" class="discovery__genres">
          <span v-for="g in work.genres.slice(0, 3)" :key="g" class="discovery__genre">{{ g }}</span>
        </div>
        <p v-if="work.description" class="discovery__synopsis">{{ truncate(nettoyerTexte(work.description) ?? '', 180) }}</p>
        <div class="discovery__footer">
          <span class="discovery__reviews">{{ work.review_count }} avis</span>
          <button class="discovery__cta">Voir la fiche →</button>
        </div>
      </div>
    </div>

    <div v-else class="discovery__empty">Aucune œuvre trouvée pour ces catégories.</div>
  </section>
</template>

<script setup>
import { nettoyerTexte } from '@/utils/texte.js'
import { ref, computed, onMounted } from 'vue'
import { worksApi } from '@/api/index.js'
import { useAnimationPref } from '@/composables/useAnimationPref.js'
import StarDisplay from './StarDisplay.vue'

const { skipNextAnimation } = useAnimationPref()

let clickTimer = null
function handleClick() {
  if (clickTimer) return
  clickTimer = setTimeout(() => { clickTimer = null; emit('open', work.value) }, 150)
}
function handleDblClick() {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  skipNextAnimation()
  emit('open', work.value)
}

const emit = defineEmits(['open'])

const TYPES = [
  { value: 'book', label: 'Livres' },
  { value: 'manga', label: 'Mangas' },
  { value: 'film', label: 'Films' },
  { value: 'series', label: 'Séries' },
  { value: 'music', label: 'Musique' },
  { value: 'game', label: 'Jeux' },
]
const TYPE_NAMES = { book: 'Livre', manga: 'Manga', film: 'Film', series: 'Série', music: 'Musique', game: 'Jeu vidéo' }

const selectedTypes = ref(['book', 'manga', 'film', 'series', 'music', 'game'])
const work = ref(null)
const loading = ref(false)

function toggleType(type) {
  const idx = selectedTypes.value.indexOf(type)
  if (idx === -1) {
    selectedTypes.value.push(type)
  } else if (selectedTypes.value.length > 1) {
    selectedTypes.value.splice(idx, 1)
  }
}

async function fetchRandom() {
  loading.value = true
  try {
    const { data } = await worksApi.getRandom(selectedTypes.value)
    work.value = data
  } catch {
    work.value = null
  } finally {
    loading.value = false
  }
}

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

const placeholderBg = computed(() => {
  if (!work.value) return ''
  const hue = titleHash(work.value.title) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
})

function truncate(str, max) {
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str
}

onMounted(fetchRandom)
</script>

<style scoped>
.discovery {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.discovery__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.discovery__title {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 400;
  font-style: italic;
  color: var(--color-amber-lt);
  flex-shrink: 0;
}

.discovery__filters { display: flex; flex-wrap: wrap; gap: 0.35rem; flex: 1; }

.discovery__pill {
  padding: 2px 10px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all var(--transition);
}
.discovery__pill.active {
  background: rgba(200,130,26,0.12);
  border-color: var(--color-amber);
  color: var(--color-amber);
}

.discovery__refresh {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all var(--transition);
  flex-shrink: 0;
}
.discovery__refresh:hover { border-color: var(--color-amber); color: var(--color-amber); }
.discovery__refresh:disabled { opacity: 0.4; }

.discovery__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
}

.discovery__card {
  display: flex;
  gap: 1.25rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
}
.discovery__card:hover {
  border-color: rgba(200,130,26,0.35);
  background: rgba(200,130,26,0.04);
}

.discovery__cover {
  flex-shrink: 0;
  width: 80px;
  height: 115px;
  border-radius: 4px;
  overflow: hidden;
}
.discovery__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.discovery__cover-ph { width: 100%; height: 100%; }

.discovery__info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.discovery__meta-top { display: flex; align-items: center; gap: 0.75rem; }

.discovery__type {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-amber);
  font-weight: 600;
}

.discovery__rating {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--color-amber-lt);
}

.discovery__work-title {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: 400;
  line-height: 1.2;
}

.discovery__author {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.discovery__genres { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.discovery__genre {
  font-size: 0.65rem;
  padding: 2px 7px;
  border-radius: 3px;
  background: rgba(255,255,255,0.05);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.discovery__synopsis {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  font-style: italic;
}

.discovery__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.discovery__reviews { font-size: 0.72rem; color: var(--color-text-muted); }

.discovery__cta {
  font-size: 0.75rem;
  color: var(--color-amber);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-serif);
  font-style: italic;
}

.discovery__empty {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 1rem 0;
}
</style>
