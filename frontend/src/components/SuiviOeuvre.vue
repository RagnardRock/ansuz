<template>
  <section class="suivi" aria-label="Mon suivi">
    <div class="suivi__statuts" role="group" aria-label="Statut">
      <button v-for="s in statuts" :key="s.value" type="button" class="suivi__statut"
        :class="{ 'suivi__statut--on': suivi?.status === s.value }"
        :aria-pressed="suivi?.status === s.value" :disabled="enCours" @click="choisir(s.value)">
        <svg v-if="suivi?.status === s.value" width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
        {{ s.label }}
      </button>
    </div>

    <div v-if="unite && suivi && suivi.status !== 'planned'" class="suivi__progression">
      <label :for="idChamp" class="suivi__label">Où j'en suis</label>
      <div class="suivi__stepper">
        <button type="button" class="suivi__pas" :aria-label="`${unite.nom} précédent`"
          :disabled="enCours || !(suivi.progress > 0)" @click="avancer(-1)">−</button>
        <span class="suivi__unite">{{ unite.court }}</span>
        <input :id="idChamp" v-model.number="saisie" type="number" min="0" :max="total ?? undefined"
          inputmode="numeric" class="suivi__champ" @change="enregistrerSaisie" />
        <span v-if="total" class="suivi__total">/ {{ total }}</span>
        <button type="button" class="suivi__pas" :aria-label="`${unite.nom} suivant`"
          :disabled="enCours || (total && suivi.progress >= total)" @click="avancer(1)">+</button>
      </div>
    </div>

    <p v-if="dates" class="suivi__dates">{{ dates }}</p>
    <div class="suivi__bas">
      <p v-if="erreur" class="suivi__erreur" role="alert">{{ erreur }}</p>
      <button v-if="suivi" type="button" class="suivi__retirer" :disabled="enCours" @click="retirer">
        Retirer de ma bibliothèque
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { worksApi } from '@/api/index.js'

const props = defineProps({
  work: { type: Object, required: true },
  initial: { type: Object, default: null },
})

const suivi = ref(props.initial)
const saisie = ref(props.initial?.progress ?? 0)
const enCours = ref(false)
const erreur = ref('')
const idChamp = `suivi-${props.work.id}`

watch(() => props.initial, (v) => { suivi.value = v; saisie.value = v?.progress ?? 0 })

// « À lire », « À voir », « À écouter », « À jouer » selon le type d'œuvre
const VERBES = {
  book: ['À lire', 'En cours', 'Lu'], manga: ['À lire', 'En cours', 'Lu'],
  film: ['À voir', 'En cours', 'Vu'], series: ['À voir', 'En cours', 'Vue'],
  music: ['À écouter', 'En cours', 'Écouté'], game: ['À jouer', 'En cours', 'Fini'],
}
const statuts = computed(() => {
  const [a, b, c] = VERBES[props.work.type] ?? ['À faire', 'En cours', 'Fini']
  return [
    { value: 'planned', label: a },
    { value: 'in_progress', label: b },
    { value: 'completed', label: c },
    { value: 'dropped', label: 'Abandonné' },
  ]
})

// Unité de progression : pages pour un livre, tomes pour un manga, épisodes pour une série
const UNITES = {
  book: { nom: 'Page', court: 'p.' },
  manga: { nom: 'Tome', court: 'T.' },
  series: { nom: 'Épisode', court: 'ép.' },
}
const unite = computed(() => UNITES[props.work.type] ?? null)
const total = computed(() => {
  if (props.work.type === 'book') return props.work.page_count || null
  if (props.work.type === 'manga') return props.work.volume_count || null
  return null
})

const dates = computed(() => {
  const s = suivi.value
  if (!s) return ''
  const f = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  if (s.status === 'completed' && s.finished_at) return `Terminé le ${f(s.finished_at)}`
  if (s.started_at) return `Commencé le ${f(s.started_at)}`
  return ''
})

async function enregistrer(donnees) {
  enCours.value = true
  erreur.value = ''
  try {
    const { data } = await worksApi.setLibrary(props.work.id, donnees)
    suivi.value = data
    saisie.value = data.progress ?? 0
  } catch (e) {
    erreur.value = e.response?.data?.error ?? 'Enregistrement impossible, réessaie.'
  } finally { enCours.value = false }
}

function choisir(status) {
  if (suivi.value?.status === status) return
  const donnees = { status }
  // Fini : la progression passe au total connu
  if (status === 'completed' && total.value) donnees.progress = total.value
  enregistrer(donnees)
}

function avancer(pas) {
  const p = Math.max(0, (suivi.value?.progress ?? 0) + pas)
  enregistrer({ status: suivi.value.status, progress: total.value ? Math.min(p, total.value) : p })
}

function enregistrerSaisie() {
  const p = Number(saisie.value)
  if (!Number.isInteger(p) || p < 0) { saisie.value = suivi.value?.progress ?? 0; return }
  enregistrer({ status: suivi.value.status, progress: total.value ? Math.min(p, total.value) : p })
}

async function retirer() {
  enCours.value = true
  erreur.value = ''
  try {
    await worksApi.removeLibrary(props.work.id)
    suivi.value = null
    saisie.value = 0
  } catch {
    erreur.value = 'Suppression impossible, réessaie.'
  } finally { enCours.value = false }
}
</script>

<style scoped>
.suivi {
  display: flex; flex-direction: column; gap: 0.7rem;
  padding: 0.85rem; border-radius: 12px;
  background: rgba(180,140,80,0.1); border: 1px solid rgba(180,140,80,0.25);
}
.suivi__statuts { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.suivi__statut {
  min-height: 40px; padding: 0 0.85rem; border-radius: 20px;
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.8rem; font-weight: 500; color: #3d2510;
  background: rgba(255,250,240,0.6); border: 1px solid rgba(180,140,80,0.35);
  transition: background 0.15s, border-color 0.15s;
}
.suivi__statut:hover:not(:disabled) { border-color: #c8821a; }
.suivi__statut--on { background: var(--color-amber); border-color: var(--color-amber); color: #0d0600; font-weight: 600; }
.suivi__statut:disabled { cursor: wait; }

.suivi__progression { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; flex-wrap: wrap; }
.suivi__label { font-size: 0.8rem; color: #5c3a1e; }
.suivi__stepper { display: flex; align-items: center; gap: 0.35rem; }
.suivi__pas {
  width: 40px; height: 40px; border-radius: 20px; font-size: 1.1rem; line-height: 1;
  color: #3d2510; background: rgba(255,250,240,0.6); border: 1px solid rgba(180,140,80,0.35);
}
.suivi__pas:disabled { opacity: 0.4; }
.suivi__unite, .suivi__total { font-size: 0.8rem; color: #5c3a1e; }
.suivi__champ {
  width: 4.2rem; height: 36px; text-align: center; border-radius: 8px;
  border: 1px solid rgba(180,140,80,0.4); background: #fffaf0; color: #2a1a08; font-size: 0.85rem;
  -moz-appearance: textfield;
}
.suivi__champ::-webkit-outer-spin-button, .suivi__champ::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

.suivi__dates { font-size: 0.72rem; color: #8a6a40; margin: 0; }
.suivi__bas { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.suivi__bas:empty { display: none; }
.suivi__erreur { font-size: 0.75rem; color: #b03030; margin: 0; }
.suivi__retirer { margin-left: auto; font-size: 0.7rem; color: #8a6a40; background: transparent; text-decoration: underline; }
</style>
