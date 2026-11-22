<template>
  <div class="ar">
    <!-- ── Étape 1 : une seule recherche ── -->
    <template v-if="!choisie">
      <div class="ar__recherche">
        <svg class="ar__loupe" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <label for="ar-champ" class="ar__cache">Titre ou auteur</label>
        <input id="ar-champ" ref="champ" v-model="texte" type="search" autocomplete="off" class="ar__champ"
          placeholder="Dune, Frieren, Interstellar…" @keydown.down.prevent="deplacer(1)" @keydown.up.prevent="deplacer(-1)"
          @keydown.enter.prevent="validerClavier" />
      </div>

      <div class="ar__types" role="group" aria-label="Type d'œuvre">
        <button v-for="t in TYPES" :key="t.value ?? 'tout'" type="button" class="ar__type"
          :class="{ active: type === t.value }" :aria-pressed="type === t.value" @click="type = t.value">{{ t.label }}</button>
      </div>

      <p v-if="texte.trim().length < 2" class="ar__aide">Tape un titre : tu pourras le noter ou le mettre dans ta liste en deux gestes.</p>

      <template v-else>
        <p class="ar__section">Dans Ansuz</p>
        <p v-if="chargement" class="ar__aide">Recherche…</p>
        <p v-else-if="resultats.length === 0" class="ar__aide">Rien trouvé dans Ansuz.</p>
        <ul v-else class="ar__liste" role="listbox" aria-label="Œuvres trouvées">
          <li v-for="(w, i) in resultats" :key="w.id">
            <button type="button" class="ar__ligne" :class="{ actif: i === curseur }" role="option"
              :aria-selected="i === curseur" @click="choisir(w)" @mouseenter="curseur = i">
              <span class="ar__couv">
                <img v-if="w.cover_url" :src="w.cover_url" alt="" loading="lazy" />
                <span v-else class="ar__couv-ph" :style="{ background: fond(w.title) }" />
              </span>
              <span class="ar__infos">
                <span class="ar__titre">{{ w.title }}</span>
                <span class="ar__meta">
                  <span class="ar__meta-type">{{ NOMS[w.type] ?? w.type }}</span>
                  <template v-if="w.release_year"> · {{ w.release_year }}</template>
                  <template v-if="w.author"> · {{ w.author }}</template>
                </span>
              </span>
              <span v-if="w.my_status" class="ar__badge">{{ libelleStatut(w.my_status, w.type) }}</span>
              <span v-else-if="w.my_review" class="ar__badge">Noté</span>
            </button>
          </li>
        </ul>

        <!-- En ligne : seulement sur demande, les sources externes sont lentes -->
        <div class="ar__enligne">
          <button v-if="!enLigneLance" type="button" class="ar__secondaire" @click="chercherEnLigne">
            Pas trouvé ? Chercher « {{ texte.trim() }} » en ligne
          </button>
          <template v-else>
            <p class="ar__section">En ligne</p>
            <p v-if="enLigneChargement" class="ar__aide">Recherche dans les catalogues… (ça peut prendre quelques secondes)</p>
            <p v-else-if="enLigne.length === 0" class="ar__aide">Rien trouvé en ligne{{ type ? '' : ' (essaie en choisissant un type)' }}.</p>
            <ul v-else class="ar__liste">
              <li v-for="(r, i) in enLigne" :key="i">
                <button type="button" class="ar__ligne" :disabled="creation" @click="creerDepuis(r)">
                  <span class="ar__couv">
                    <img v-if="r.image" :src="r.image" alt="" loading="lazy" />
                    <span v-else class="ar__couv-ph" :style="{ background: fond(r.title) }" />
                  </span>
                  <span class="ar__infos">
                    <span class="ar__titre">{{ r.title }}</span>
                    <span class="ar__meta">
                      <span class="ar__meta-type">{{ NOMS[typeDe(r)] ?? '' }}</span>
                      <template v-if="r.metadata?.release_year"> · {{ r.metadata.release_year }}</template>
                      <template v-if="r.author"> · {{ r.author }}</template>
                    </span>
                  </span>
                  <span class="ar__plus" aria-hidden="true">+</span>
                </button>
              </li>
            </ul>
          </template>
          <p v-if="erreur" class="ar__erreur" role="alert">{{ erreur }}</p>
          <button type="button" class="ar__lien" @click="$emit('full', texte.trim())">
            Remplir le formulaire complet à la main
          </button>
        </div>
      </template>
    </template>

    <!-- ── Étape 2 : statut et note ── -->
    <div v-else class="ar__fiche">
      <button type="button" class="ar__retour" @click="choisie = null">← Autre recherche</button>
      <div class="ar__entete">
        <span class="ar__couv ar__couv--grande">
          <img v-if="choisie.cover_url" :src="choisie.cover_url" alt="" />
          <span v-else class="ar__couv-ph" :style="{ background: fond(choisie.title) }" />
        </span>
        <div class="ar__infos">
          <span class="ar__titre ar__titre--grand">{{ choisie.title }}</span>
          <span class="ar__meta">
            <span class="ar__meta-type">{{ NOMS[choisie.type] }}</span>
            <template v-if="choisie.release_year"> · {{ choisie.release_year }}</template>
            <template v-if="choisie.author"> · {{ choisie.author }}</template>
          </span>
          <span v-if="nouvelle" class="ar__nouveau">Ajoutée à Ansuz ✓</span>
        </div>
      </div>

      <div>
        <p class="ar__section">Statut</p>
        <div class="ar__statuts" role="group" aria-label="Statut">
          <button v-for="s in statuts" :key="s.value" type="button" class="ar__statut"
            :class="{ active: statut === s.value }" :aria-pressed="statut === s.value"
            @click="statut = statut === s.value ? null : s.value">{{ s.label }}</button>
        </div>
      </div>

      <div>
        <p class="ar__section">Ma note <span class="ar__facultatif">(facultatif)</span></p>
        <div class="ar__etoiles" role="radiogroup" aria-label="Note sur 5" @mouseleave="survol = 0">
          <button v-for="i in 5" :key="i" type="button" class="ar__etoile" role="radio"
            :aria-checked="Math.ceil(note) === i" :aria-label="`${i} sur 5 (clic à gauche : ${i - 0.5})`"
            @mousemove="survol = demi($event, i)" @click="note = note === demi($event, i) ? 0 : demi($event, i)">
            <span class="ar__etoile-fond">★</span>
            <span class="ar__etoile-plein" :style="{ width: remplissage(i) }">★</span>
          </button>
          <span class="ar__note">{{ (survol || note) ? String(survol || note).replace('.', ',') + ' / 5' : '' }}</span>
        </div>
        <button v-if="!avecTexte" type="button" class="ar__lien ar__lien--gauche" @click="avecTexte = true">+ Ajouter quelques mots</button>
        <textarea v-else v-model="avis" rows="3" maxlength="5000" class="ar__texte" placeholder="Ce que tu en as pensé…" />
        <p v-if="avisExistant" class="ar__aide ar__aide--gauche">Tu as déjà un avis : il sera mis à jour.</p>
      </div>

      <p v-if="erreur" class="ar__erreur" role="alert">{{ erreur }}</p>
      <div class="ar__actions">
        <button type="button" class="ar__secondaire" @click="$emit('open-work', choisie)">Voir la fiche</button>
        <button type="button" class="ar__principal" :disabled="enregistrement || !modifie" @click="enregistrer">
          {{ enregistrement ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { worksApi, reviewsApi, searchApi } from '@/api/index.js'
import { useWorksStore } from '@/stores/works.js'

const props = defineProps({
  initialType: { type: String, default: null },
  initialText: { type: String, default: '' },
})
const emit = defineEmits(['open-work', 'full', 'saved'])
const worksStore = useWorksStore()

const TYPES = [
  { value: null, label: 'Tout' },
  { value: 'book', label: 'Livre' }, { value: 'manga', label: 'Manga' },
  { value: 'film', label: 'Film' }, { value: 'series', label: 'Série' },
  { value: 'music', label: 'Musique' }, { value: 'game', label: 'Jeu' },
]
const NOMS = { book: 'Livre', manga: 'Manga', film: 'Film', series: 'Série', music: 'Album', game: 'Jeu' }
const VERBES = {
  book: ['À lire', 'Lu'], manga: ['À lire', 'Lu'], film: ['À voir', 'Vu'], series: ['À voir', 'Vue'],
  music: ['À écouter', 'Écouté'], game: ['À jouer', 'Fini'],
}
// Sans type choisi, la recherche en ligne ne couvre que livres et mangas : on déduit le type de la source.
const TYPE_SOURCE = { googlebooks: 'book', openlibrary: 'book', anilist: 'manga', rawg: 'game', itunes: 'music', deezer: 'music' }

const champ = ref(null)
const texte = ref(props.initialText)
const type = ref(props.initialType)
const resultats = ref([])
const chargement = ref(false)
const curseur = ref(0)
const enLigne = ref([])
const enLigneLance = ref(false)
const enLigneChargement = ref(false)
const creation = ref(false)
const erreur = ref('')

const choisie = ref(null)
const nouvelle = ref(false)
const statut = ref(null)
const note = ref(0)
const survol = ref(0)
const avis = ref('')
const avecTexte = ref(false)
const avisExistant = ref(null)
const enregistrement = ref(false)
const depart = ref({})
// Enregistrer n'est actif que si quelque chose a changé
const modifie = computed(() => statut.value !== depart.value.statut || note.value !== depart.value.note
  || avis.value.trim() !== depart.value.avis)

onMounted(() => { champ.value?.focus(); if (texte.value) rechercher() })

let minuteur = null
let numero = 0
watch([texte, type], () => {
  enLigneLance.value = false
  enLigne.value = []
  clearTimeout(minuteur)
  minuteur = setTimeout(rechercher, 250)
})

async function rechercher() {
  const q = texte.value.trim()
  if (q.length < 2) { resultats.value = []; return }
  const n = ++numero
  chargement.value = true
  try {
    const { data } = await worksApi.getAll({ search: q, type: type.value ?? undefined, per_page: 8, sort: 'reviews' })
    if (n !== numero) return
    resultats.value = data.works ?? []
    curseur.value = 0
  } catch {
    if (n === numero) resultats.value = []
  } finally { if (n === numero) chargement.value = false }
}

function deplacer(pas) {
  if (!resultats.value.length) return
  curseur.value = (curseur.value + pas + resultats.value.length) % resultats.value.length
}
function validerClavier() { const w = resultats.value[curseur.value]; if (w) choisir(w) }

async function chercherEnLigne() {
  enLigneLance.value = true
  enLigneChargement.value = true
  erreur.value = ''
  try {
    const { data } = await searchApi.covers(texte.value.trim(), type.value)
    enLigne.value = (data ?? []).slice(0, 8)
  } catch {
    enLigne.value = []
  } finally { enLigneChargement.value = false }
}

function typeDe(r) { return type.value ?? TYPE_SOURCE[r.source] ?? 'book' }

async function creerDepuis(r) {
  creation.value = true
  erreur.value = ''
  const m = r.metadata ?? {}
  try {
    const work = await worksStore.create({
      ...m,
      type: typeDe(r),
      title: r.title,
      author: r.author ?? null,
      cover_url: r.image ?? null,
      cdn_source: r.source,
      synopsis: m.description ?? null,
      description: undefined,
    })
    nouvelle.value = true
    choisir(work)
  } catch (e) {
    erreur.value = e.response?.data?.error ?? 'Ajout impossible, réessaie.'
  } finally { creation.value = false }
}

async function choisir(w) {
  choisie.value = w
  statut.value = w.my_status ?? null
  avisExistant.value = w.my_review ?? null
  note.value = w.my_review?.rating ? Number(w.my_review.rating) : 0
  avis.value = w.my_review?.description ?? ''
  avecTexte.value = !!avis.value
  depart.value = { statut: statut.value, note: note.value, avis: avis.value.trim() }
  erreur.value = ''
  await nextTick()
}

const statuts = computed(() => {
  const [a, f] = VERBES[choisie.value?.type] ?? ['À faire', 'Fini']
  return [
    { value: 'planned', label: a }, { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: f }, { value: 'dropped', label: 'Abandonné' },
  ]
})
function libelleStatut(s, t) {
  const [a, f] = VERBES[t] ?? ['À faire', 'Fini']
  return { planned: a, in_progress: 'En cours', completed: f, dropped: 'Abandonné' }[s]
}

// Clic sur la moitié gauche d'une étoile = demi-point
function demi(e, i) {
  const r = e.currentTarget.getBoundingClientRect()
  return e.clientX - r.left < r.width / 2 ? i - 0.5 : i
}
function remplissage(i) {
  const v = survol.value || note.value
  return v >= i ? '100%' : v >= i - 0.5 ? '50%' : '0%'
}

async function enregistrer() {
  enregistrement.value = true
  erreur.value = ''
  const w = choisie.value
  try {
    if (statut.value) await worksApi.setLibrary(w.id, { status: statut.value })
    else if (w.my_status) await worksApi.removeLibrary(w.id)

    const texteAvis = avis.value.trim()
    if (note.value || texteAvis) {
      const donnees = { ...(note.value ? { rating: note.value } : {}), ...(texteAvis ? { description: texteAvis } : {}) }
      if (avisExistant.value) await reviewsApi.update(avisExistant.value.id, donnees)
      else await worksApi.addReview(w.id, donnees)
      worksStore.refreshWork(w.id)
    }
    emit('saved', w)
  } catch (e) {
    erreur.value = e.response?.data?.error ?? 'Enregistrement impossible, réessaie.'
  } finally { enregistrement.value = false }
}

function fond(title) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h)
  const hue = Math.abs(h) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
}
</script>

<style scoped>
.ar { padding: 1.1rem 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.ar__cache { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.ar__recherche { position: relative; }
.ar__loupe { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); color: var(--color-text-muted); }
.ar__champ {
  width: 100%; box-sizing: border-box; height: 48px; padding: 0 1rem 0 2.6rem; border-radius: 12px;
  border: 1px solid var(--color-border); background: rgba(255,255,255,0.04); color: var(--color-text); font-size: 1rem;
}
.ar__champ:focus { outline: none; border-color: var(--color-amber); }

.ar__types { display: flex; gap: 0.35rem; overflow-x: auto; scrollbar-width: none; }
.ar__type {
  flex-shrink: 0; min-height: 34px; padding: 0 0.8rem; border-radius: 17px; font-size: 0.78rem;
  background: transparent; border: 1px solid var(--color-border); color: var(--color-text-muted);
}
.ar__type.active { background: rgba(200,130,26,0.15); border-color: var(--color-amber); color: var(--color-amber-lt); }

.ar__section { margin: 0 0 0.4rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); }
.ar__facultatif { text-transform: none; letter-spacing: 0; opacity: 0.8; }
.ar__aide { margin: 0; font-size: 0.85rem; color: var(--color-text-muted); text-align: center; padding: 0.4rem 0; }
.ar__aide--gauche { text-align: left; font-size: 0.75rem; }
.ar__erreur { margin: 0; font-size: 0.8rem; color: #e07070; }

.ar__liste { list-style: none; margin: -0.4rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.ar__ligne {
  width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.7rem; text-align: left;
  border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: inherit; cursor: pointer;
}
.ar__ligne.actif, .ar__ligne:hover { border-color: var(--color-amber); background: rgba(200,130,26,0.07); }
.ar__ligne:disabled { opacity: 0.5; cursor: wait; }
.ar__couv { width: 36px; height: 52px; flex-shrink: 0; border-radius: 3px; overflow: hidden; background: rgba(255,255,255,0.05); }
.ar__couv--grande { width: 64px; height: 94px; border-radius: 4px; }
.ar__couv img, .ar__couv-ph { width: 100%; height: 100%; object-fit: cover; display: block; }
.ar__infos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.ar__titre { font-family: var(--font-serif); font-style: italic; font-size: 0.95rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ar__titre--grand { font-size: 1.15rem; white-space: normal; }
.ar__meta { font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ar__meta-type { color: var(--color-amber); font-weight: 500; }
.ar__badge { flex-shrink: 0; font-size: 0.68rem; padding: 0.15rem 0.5rem; border-radius: 10px; background: rgba(200,130,26,0.15); color: var(--color-amber-lt); }
.ar__plus { flex-shrink: 0; width: 30px; height: 30px; border-radius: 15px; display: flex; align-items: center; justify-content: center; background: var(--color-amber); color: #0d0600; font-weight: 700; }

.ar__enligne { display: flex; flex-direction: column; gap: 0.6rem; border-top: 1px solid var(--color-border); padding-top: 0.9rem; }
.ar__secondaire {
  min-height: 42px; padding: 0 1rem; border-radius: 10px; font-size: 0.85rem;
  background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
}
.ar__secondaire:hover { border-color: var(--color-amber); color: var(--color-amber-lt); }
.ar__lien { align-self: center; font-size: 0.78rem; color: var(--color-text-muted); background: transparent; text-decoration: underline; }
.ar__lien--gauche { align-self: flex-start; margin-top: 0.5rem; }
.ar__lien:hover { color: var(--color-amber-lt); }

.ar__fiche { display: flex; flex-direction: column; gap: 1.1rem; }
.ar__retour { align-self: flex-start; font-size: 0.8rem; color: var(--color-text-muted); background: transparent; }
.ar__entete { display: flex; gap: 0.9rem; align-items: center; }
.ar__nouveau { font-size: 0.72rem; color: #7fc08f; }
.ar__statuts { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.ar__statut {
  min-height: 42px; padding: 0 0.95rem; border-radius: 21px; font-size: 0.85rem;
  background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
}
.ar__statut.active { background: var(--color-amber); border-color: var(--color-amber); color: #0d0600; font-weight: 600; }
.ar__etoiles { display: flex; align-items: center; gap: 0.15rem; }
.ar__etoile { position: relative; width: 40px; height: 40px; font-size: 2rem; line-height: 40px; background: transparent; padding: 0; }
.ar__etoile-fond { color: rgba(255,255,255,0.15); }
.ar__etoile-plein { position: absolute; left: 0; top: 0; overflow: hidden; color: var(--color-amber); white-space: nowrap; }
.ar__note { margin-left: 0.5rem; font-size: 0.9rem; color: var(--color-amber-lt); min-width: 4rem; }
.ar__texte {
  width: 100%; box-sizing: border-box; margin-top: 0.5rem; padding: 0.6rem 0.75rem; border-radius: 10px; resize: vertical;
  border: 1px solid var(--color-border); background: rgba(255,255,255,0.04); color: var(--color-text); font: inherit; font-size: 0.88rem;
}
.ar__actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.ar__principal { min-height: 44px; padding: 0 1.3rem; border-radius: 10px; font-weight: 600; background: var(--color-amber); color: #0d0600; }
.ar__principal:disabled { opacity: 0.45; }
</style>
