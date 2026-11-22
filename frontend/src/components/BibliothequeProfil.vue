<template>
  <div class="biblio">
    <div class="biblio__filtres" role="group" aria-label="Filtrer par statut">
      <button v-for="f in filtres" :key="f.value" type="button" class="biblio__filtre"
        :class="{ active: filtre === f.value }" :aria-pressed="filtre === f.value" @click="filtre = f.value">
        {{ f.label }} <span class="biblio__nb">{{ f.nb }}</span>
      </button>
    </div>

    <p v-if="chargement" class="biblio__vide">Chargement…</p>
    <p v-else-if="erreur" class="biblio__vide">{{ erreur }}</p>
    <p v-else-if="visibles.length === 0" class="biblio__vide">
      {{ total === 0 ? 'Rien dans la bibliothèque pour l\'instant.' : 'Aucune œuvre avec ce statut.' }}
    </p>
    <div v-else class="biblio__grille">
      <button v-for="w in visibles" :key="w.id" type="button" class="biblio__tuile"
        :aria-label="`${w.title}, ${libelle(w)}`" @click="$emit('open', w.id)">
        <div class="biblio__couv">
          <img v-if="w.cover_url" :src="w.cover_url" :alt="''" loading="lazy" />
          <div v-else class="biblio__couv-ph" :style="{ background: fond(w.title) }"><span>{{ w.title }}</span></div>
        </div>
        <span class="biblio__statut" :class="`biblio__statut--${w.status}`">{{ libelle(w) }}</span>
        <div v-if="pourcent(w) !== null" class="biblio__barre" aria-hidden="true">
          <div :style="{ width: pourcent(w) + '%' }" />
        </div>
        <p class="biblio__titre">{{ w.title }}</p>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { userApi } from '@/api/index.js'

const props = defineProps({ username: { type: String, required: true } })
defineEmits(['open'])

const works = ref([])
const counts = ref({ planned: 0, in_progress: 0, completed: 0, dropped: 0 })
const chargement = ref(true)
const erreur = ref('')
const filtre = ref('in_progress')

async function charger() {
  chargement.value = true
  erreur.value = ''
  try {
    const { data } = await userApi.getLibrary(props.username)
    works.value = data.works
    counts.value = data.counts
    // Ouvre sur « En cours » s'il y a quelque chose, sinon sur « Tout »
    filtre.value = data.counts.in_progress > 0 ? 'in_progress' : 'all'
  } catch {
    erreur.value = 'Impossible de charger la bibliothèque.'
  } finally { chargement.value = false }
}
watch(() => props.username, charger, { immediate: true })

const total = computed(() => Object.values(counts.value).reduce((a, b) => a + b, 0))
const filtres = computed(() => [
  { value: 'all', label: 'Tout', nb: total.value },
  { value: 'in_progress', label: 'En cours', nb: counts.value.in_progress },
  { value: 'planned', label: 'À faire', nb: counts.value.planned },
  { value: 'completed', label: 'Finis', nb: counts.value.completed },
  { value: 'dropped', label: 'Abandonnés', nb: counts.value.dropped },
])
const visibles = computed(() => filtre.value === 'all' ? works.value : works.value.filter((w) => w.status === filtre.value))

const A_FAIRE = { book: 'À lire', manga: 'À lire', film: 'À voir', series: 'À voir', music: 'À écouter', game: 'À jouer' }
const FINI = { book: 'Lu', manga: 'Lu', film: 'Vu', series: 'Vue', music: 'Écouté', game: 'Fini' }
const UNITE = { book: 'p.', manga: 'T.', series: 'ép.' }

function libelle(w) {
  if (w.status === 'planned') return A_FAIRE[w.type] ?? 'À faire'
  if (w.status === 'completed') return FINI[w.type] ?? 'Fini'
  if (w.status === 'dropped') return 'Abandonné'
  return w.progress && UNITE[w.type] ? `${UNITE[w.type]} ${w.progress}` : 'En cours'
}

function pourcent(w) {
  if (w.status !== 'in_progress' || !w.progress) return null
  const t = w.type === 'book' ? w.page_count : w.type === 'manga' ? w.volume_count : null
  return t ? Math.min(100, Math.round((w.progress / t) * 100)) : null
}

function fond(title) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h)
  const hue = Math.abs(h) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
}
</script>

<style scoped>
.biblio { display: flex; flex-direction: column; gap: 1rem; }
.biblio__filtres { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.biblio__filtre {
  min-height: 36px; padding: 0 0.8rem; font-size: 0.78rem; border-radius: 18px; background: transparent;
  border: 1px solid var(--color-border); color: var(--color-text-muted); transition: all var(--transition);
}
.biblio__filtre:hover { border-color: var(--color-amber); color: var(--color-amber-lt); }
.biblio__filtre.active { background: rgba(200, 130, 26, 0.15); border-color: var(--color-amber); color: var(--color-amber-lt); }
.biblio__nb { opacity: 0.7; margin-left: 0.2rem; }
.biblio__vide { text-align: center; padding: 2rem 0; color: var(--color-text-muted); font-size: 0.9rem; }

.biblio__grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 1rem 0.85rem; }
.biblio__tuile { position: relative; display: flex; flex-direction: column; gap: 0.35rem; text-align: left; cursor: pointer; background: transparent; border: none; padding: 0; color: inherit; }
.biblio__couv {
  aspect-ratio: 2 / 3; border-radius: 6px; overflow: hidden;
  border: 1px solid var(--color-border); transition: transform 0.2s, border-color 0.2s;
}
.biblio__tuile:hover .biblio__couv { transform: translateY(-2px); border-color: rgba(200, 130, 26, 0.5); }
.biblio__couv img { width: 100%; height: 100%; object-fit: cover; display: block; }
.biblio__couv-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 0.5rem; box-sizing: border-box; }
.biblio__couv-ph span { font-family: var(--font-serif); font-style: italic; font-size: 0.8rem; color: #f3e6d3; text-align: center; }
.biblio__statut {
  position: absolute; top: 6px; left: 6px; padding: 0.15rem 0.5rem; border-radius: 10px;
  font-size: 0.65rem; font-weight: 600; background: rgba(13, 6, 0, 0.78); color: #f3e6d3;
}
.biblio__statut--in_progress { background: var(--color-amber); color: #0d0600; }
.biblio__statut--completed { background: rgba(60, 120, 80, 0.9); }
.biblio__statut--dropped { opacity: 0.8; }
.biblio__barre { height: 4px; border-radius: 2px; background: rgba(200, 130, 26, 0.2); overflow: hidden; }
.biblio__barre div { height: 100%; background: var(--color-amber); }
.biblio__titre {
  margin: 0; font-size: 0.78rem; color: var(--color-text); line-height: 1.25;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
@media (max-width: 480px) {
  .biblio__grille { grid-template-columns: repeat(3, 1fr); gap: 0.8rem 0.6rem; }
}
</style>
