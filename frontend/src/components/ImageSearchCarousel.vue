<template>
  <div class="carousel">
    <div v-if="loading" class="carousel__loading">
      <span class="spinner-sm" /> Recherche des couvertures…
    </div>

    <template v-else-if="results.length > 0">
      <p class="carousel__label">Choisissez une couverture :</p>
      <div class="carousel__track">
        <button
          v-for="(item, i) in results"
          :key="i"
          type="button"
          class="carousel__item"
          :class="{ selected: modelValue === item.image && !item._nocover, 'carousel__item--nocover': item._nocover }"
          :title="item.title"
          @click="onSelect(item)"
        >
          <img :src="item.image" :alt="item.title" loading="lazy" :style="item._nocover ? 'display:none' : ''" @error="item._err = true" @load="onImageLoad($event, item)" />
          <div v-if="item._nocover" class="carousel__nocover">Pas de couverture</div>
          <div class="carousel__badge">{{ sourceLabel(item.source) }}</div>
          <div v-if="modelValue === item.image && !item._nocover" class="carousel__check">✓</div>
        </button>
      </div>

      <!-- Option : aucune couverture -->
      <button
        type="button"
        class="carousel__none"
        :class="{ selected: modelValue === null }"
        @click="$emit('update:modelValue', null)"
      >
        Aucune image (placeholder)
      </button>
    </template>

    <p v-else-if="searched && results.length === 0" class="carousel__empty">
      Aucune couverture trouvée — vous pouvez continuer sans image.
    </p>
  </div>
</template>

<script setup>
/**
 * ImageSearchCarousel — appelle /api/search/covers et affiche un carousel de résultats.
 *
 * v-model (modelValue + emit('update:modelValue')) est le contrat Vue pour
 * les composants qui exposent une valeur bidirectionnelle. Le parent écrit avec :
 *   <ImageSearchCarousel v-model="selectedCoverUrl" :query="title" />
 *
 * watch() réagit aux changements de `query` avec un debounce manuel (setTimeout).
 * Le debounce évite de lancer une requête à chaque frappe — on attend que
 * l'utilisateur s'arrête de taper 600ms.
 */
import { ref, watch } from 'vue'
import { searchApi } from '@/api/index.js'

const props = defineProps({
  query: { type: String, default: '' },
  modelValue: { type: String, default: null },
  type: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'select-metadata'])

const results = ref([])
const loading = ref(false)
const searched = ref(false)
let debounce = null

watch(
  () => [props.query, props.type],
  ([q]) => {
    clearTimeout(debounce)
    if (!q || q.trim().length < 2) {
      results.value = []
      searched.value = false
      return
    }

    debounce = setTimeout(async () => {
      loading.value = true
      searched.value = false
      try {
        const { data } = await searchApi.covers(q, props.type)
        results.value = data.filter((r) => r.image)
      } catch {
        results.value = []
      } finally {
        loading.value = false
        searched.value = true
      }
    }, 600)
  },
  { immediate: true }
)

const SOURCE_LABELS = {
  googlebooks: 'Google Books',
  openlibrary: 'Open Library',
  anilist: 'AniList',
  tmdb: 'TMDB',
  itunes: 'iTunes',
  deezer: 'Deezer',
  rawg: 'RAWG',
}
function sourceLabel(source) {
  return SOURCE_LABELS[source] ?? source
}

function onImageLoad(e, item) {
  if (e.target.naturalWidth < 10) item._nocover = true
}

function onSelect(item) {
  emit('update:modelValue', item._nocover ? null : item.image)
  if (item.metadata) emit('select-metadata', { source: item.source, title: item.title, author: item.author, ...item.metadata })
}
</script>

<style scoped>
.carousel {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.carousel__loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.carousel__label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.carousel__track {
  display: flex;
  gap: 0.6rem;
  overflow-x: auto;
  padding-bottom: 0.4rem;
  scrollbar-width: thin;
}
.carousel__track::-webkit-scrollbar {
  height: 4px;
}
.carousel__track::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.carousel__item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 110px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid transparent;
  transition:
    border-color var(--transition),
    transform 0.15s;
  background: var(--color-border);
}
.carousel__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.carousel__item:hover {
  transform: translateY(-3px);
  border-color: var(--color-amber);
}
.carousel__item.selected {
  border-color: var(--color-amber-lt);
}

.carousel__item--nocover {
  background: var(--color-surface-2, #1e1e1e);
  border-color: var(--color-border);
}
.carousel__nocover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.3rem;
  line-height: 1.3;
}

.carousel__badge {
  position: absolute;
  bottom: 3px;
  left: 3px;
  font-size: 0.55rem;
  padding: 1px 4px;
  background: rgba(0, 0, 0, 0.7);
  color: var(--color-amber-lt);
  border-radius: 3px;
}
.carousel__check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: var(--color-amber);
  color: #0d0600;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel__none {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  background: transparent;
  text-decoration: underline;
  align-self: flex-start;
  padding: 0;
}
.carousel__none.selected {
  color: var(--color-amber);
}
.carousel__none:hover {
  color: var(--color-text);
}

.carousel__empty {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
}

.spinner-sm {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-amber);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
