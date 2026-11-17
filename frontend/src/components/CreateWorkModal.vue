<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>{{ phase === 'search' ? 'Ajouter une œuvre' : 'Nouvelle œuvre' }}</h2>
        <button class="modal-close" aria-label="Fermer" @click="$emit('close')">✕</button>
      </div>

      <!-- ── Phase 1 : Recherche ── -->
      <div v-if="phase === 'search'" class="modal-body">
        <div class="field">
          <label for="search-title">Titre</label>
          <input
            id="search-title"
            v-model="searchText"
            type="text"
            placeholder="Dune, Vinland Saga, Interstellar…"
            autocomplete="off"
            autofocus
          />
        </div>

        <div v-if="searchText.trim()" class="search-results">
          <template v-if="matches.length > 0">
            <p class="search-results__label">Œuvres existantes</p>
            <button v-for="work in matches" :key="work.id" class="work-match" @click="selectExisting(work)">
              <div class="work-match__cover">
                <img v-if="work.cover_url" :src="work.cover_url" :alt="work.title" />
                <div v-else class="work-match__cover-placeholder" :style="{ background: placeholderFor(work) }" />
              </div>
              <div class="work-match__info">
                <span class="work-match__title">{{ work.title }}</span>
                <span class="work-match__meta">
                  <span class="work-match__type">{{ TYPE_NAMES[work.type] ?? work.type }}</span>
                  <span v-if="work.avg_rating">· ★ {{ work.avg_rating }}</span>
                  <span v-if="work.review_count > 0">· {{ work.review_count }} avis</span>
                </span>
                <span v-if="hasMyReview(work)" class="work-match__reviewed">Déjà noté</span>
              </div>
              <svg class="work-match__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          </template>
          <button class="create-new-btn" @click="goToCreate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Créer <em>« {{ searchText.trim() }} »</em> comme nouvelle œuvre
          </button>
        </div>
        <p v-else class="search-hint">Commence par taper un titre pour voir si l'œuvre existe déjà.</p>
      </div>

      <!-- ── Phase 2 : Création ── -->
      <form v-else class="modal-form" @submit.prevent="submit">
        <button type="button" class="back-btn" @click="phase = 'search'">← Retour</button>

        <!-- Type -->
        <div class="field">
          <label>Type</label>
          <div class="type-pills">
            <button v-for="t in TYPES" :key="t.value" type="button" class="type-pill"
              :class="{ active: form.type === t.value }" @click="form.type = t.value">{{ t.label }}</button>
          </div>
        </div>

        <!-- Titre -->
        <div class="field">
          <label for="title">Titre <span class="required">*</span></label>
          <input id="title" v-model="form.title" type="text" required />
        </div>

        <!-- Auteur dynamique -->
        <div class="field">
          <label for="author">{{ authorLabel }}</label>
          <input id="author" v-model="form.author" type="text" :placeholder="authorPlaceholder" />
        </div>

        <!-- Carousel couvertures -->
        <ImageSearchCarousel
          v-model="form.cover_url"
          :query="coverSearchQuery"
          :type="form.type"
          @select-metadata="applyMetadata"
        />

        <!-- Badge CDN -->
        <div v-if="form.cdn_source" class="cdn-badge">
          ✓ Informations importées depuis {{ CDN_LABELS[form.cdn_source] ?? form.cdn_source }}
        </div>
        <div v-else class="cdn-warning">
          ⚠ Aucune source CDN — cette œuvre sera soumise à validation admin avant d'être publiée.
        </div>

        <!-- ── Informations de l'œuvre (par type) ── -->
        <div class="meta-section">
          <h3 class="meta-section__title">Informations de l'œuvre</h3>

          <!-- Champs communs -->
          <div class="field-row">
            <div class="field">
              <label for="release_year">Année de sortie</label>
              <input id="release_year" v-model.number="form.release_year" type="number" min="1800" max="2100" placeholder="2024" />
            </div>
            <div class="field field--grow">
              <label for="genres">Genres <span class="field-hint">(séparés par des virgules)</span></label>
              <input id="genres" v-model="genresInput" type="text" placeholder="Action, Drame, Science-fiction…" />
            </div>
          </div>

          <div class="field">
            <label for="synopsis">Synopsis</label>
            <textarea id="synopsis" v-model="form.synopsis" rows="3" placeholder="Résumé de l'œuvre…" />
          </div>

          <!-- Livres -->
          <template v-if="form.type === 'book'">
            <div class="field-row">
              <div class="field">
                <label for="page_count">Pages</label>
                <input id="page_count" v-model.number="form.page_count" type="number" placeholder="350" />
              </div>
              <div class="field field--grow">
                <label for="publisher">Éditeur</label>
                <input id="publisher" v-model="form.publisher" type="text" placeholder="Gallimard, Actes Sud…" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="isbn">ISBN</label>
                <input id="isbn" v-model="form.isbn" type="text" placeholder="978-…" />
              </div>
              <div class="field">
                <label for="language">Langue originale</label>
                <input id="language" v-model="form.language" type="text" placeholder="fr, en, ja…" />
              </div>
            </div>
          </template>

          <!-- Mangas -->
          <template v-else-if="form.type === 'manga'">
            <div class="field-row">
              <div class="field">
                <label for="volume_count">Volumes</label>
                <input id="volume_count" v-model.number="form.volume_count" type="number" placeholder="12" />
              </div>
              <div class="field">
                <label for="status">Statut</label>
                <select id="status" v-model="form.status">
                  <option value="">—</option>
                  <option value="FINISHED">Terminé</option>
                  <option value="RELEASING">En cours</option>
                  <option value="HIATUS">En pause</option>
                </select>
              </div>
              <div class="field">
                <label for="origin">Origine</label>
                <select id="origin" v-model="form.origin">
                  <option value="">—</option>
                  <option value="JP">Manga (Japon)</option>
                  <option value="KR">Manhwa (Corée)</option>
                  <option value="CN">Manhua (Chine)</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Films -->
          <template v-else-if="form.type === 'film'">
            <div class="field-row">
              <div class="field">
                <label for="duration">Durée (min)</label>
                <input id="duration" v-model.number="form.duration" type="number" placeholder="120" />
              </div>
              <div class="field field--grow">
                <label for="main_cast">Casting principal <span class="field-hint">(séparés par des virgules)</span></label>
                <input id="main_cast" v-model="castInput" type="text" placeholder="Tom Hanks, Cate Blanchett…" />
              </div>
            </div>
          </template>

          <!-- Séries -->
          <template v-else-if="form.type === 'series'">
            <div class="field-row">
              <div class="field">
                <label for="season_count">Saisons</label>
                <input id="season_count" v-model.number="form.season_count" type="number" placeholder="5" />
              </div>
              <div class="field">
                <label for="duration">Durée / épisode (min)</label>
                <input id="duration" v-model.number="form.duration" type="number" placeholder="45" />
              </div>
              <div class="field">
                <label for="status">Statut</label>
                <select id="status" v-model="form.status">
                  <option value="">—</option>
                  <option value="Ended">Terminée</option>
                  <option value="Returning Series">En cours</option>
                  <option value="Canceled">Annulée</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label for="main_cast">Casting principal <span class="field-hint">(séparés par des virgules)</span></label>
              <input id="main_cast" v-model="castInput" type="text" placeholder="Bryan Cranston, Aaron Paul…" />
            </div>
          </template>

          <!-- Musique -->
          <template v-else-if="form.type === 'music'">
            <div class="field">
              <label for="track_count">Nombre de pistes</label>
              <input id="track_count" v-model.number="form.track_count" type="number" placeholder="12" />
            </div>
          </template>

          <!-- Jeux vidéo -->
          <template v-else-if="form.type === 'game'">
            <div class="field-row">
              <div class="field field--grow">
                <label for="publisher">Éditeur</label>
                <input id="publisher" v-model="form.publisher" type="text" placeholder="Ubisoft, EA…" />
              </div>
            </div>
            <div class="field">
              <label for="platforms">Plateformes <span class="field-hint">(séparées par des virgules)</span></label>
              <input id="platforms" v-model="platformsInput" type="text" placeholder="PC, PlayStation 5, Nintendo Switch…" />
            </div>
          </template>
        </div>

        <!-- ── Ton avis ── -->
        <div class="meta-section">
          <h3 class="meta-section__title">Ton avis</h3>
          <div class="field">
            <label for="description">Ta recommandation</label>
            <textarea id="description" v-model="form.description" rows="3" placeholder="Ce qui t'a marqué, pourquoi tu le recommandes…" />
          </div>
          <div class="field">
            <label for="link">Lien</label>
            <input id="link" v-model="form.link" type="url" placeholder="https://..." />
          </div>
          <div class="field">
            <label>Note</label>
            <div class="star-picker">
              <div v-for="i in 5" :key="i" class="star-slot">
                <button type="button" class="half-zone half-left" :aria-label="`${i - 0.5} étoiles`"
                  @mouseenter="hoverStar = i - 0.5" @mouseleave="hoverStar = 0"
                  @click="form.rating = form.rating === i - 0.5 ? null : i - 0.5" />
                <button type="button" class="half-zone half-right" :aria-label="`${i} étoiles`"
                  @mouseenter="hoverStar = i" @mouseleave="hoverStar = 0"
                  @click="form.rating = form.rating === i ? null : i" />
                <span class="sp-bg">★</span>
                <span class="sp-fg" :style="{ width: pickerFill(i) }">★</span>
              </div>
              <span v-if="form.rating" class="star-label">{{ form.rating }}/5</span>
            </div>
          </div>
        </div>

        <Transition name="fade">
          <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>
        </Transition>

        <div class="modal-footer">
          <button type="button" class="btn-ghost" @click="$emit('close')">Annuler</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="!loading">{{ form.cdn_source ? 'Publier' : 'Soumettre à validation' }}</span>
            <span v-else class="spinner-sm" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useWorksStore } from '@/stores/works.js'
import { useAuthStore } from '@/stores/auth.js'
import ImageSearchCarousel from './ImageSearchCarousel.vue'

const props = defineProps({
  initialType: { type: String, default: null },
})
const emit = defineEmits(['close', 'created', 'open-work'])
const worksStore = useWorksStore()
const auth = useAuthStore()

const TYPES = [
  { value: 'book',   label: 'Livre' },
  { value: 'manga',  label: 'Manga' },
  { value: 'film',   label: 'Film' },
  { value: 'series', label: 'Série' },
  { value: 'music',  label: 'Musique' },
  { value: 'game',   label: 'Jeu' },
]
const TYPE_NAMES = Object.fromEntries(TYPES.map((t) => [t.value, t.label]))

const CDN_LABELS = {
  googlebooks: 'Google Books',
  openlibrary: 'Open Library',
  anilist: 'AniList',
  tmdb: 'TMDB',
  itunes: 'iTunes',
  deezer: 'Deezer',
  rawg: 'RAWG',
}

const AUTHOR_META = {
  book:   { label: 'Auteur',             placeholder: 'J.K. Rowling, Tolkien…' },
  manga:  { label: 'Mangaka',            placeholder: 'Eiichiro Oda, Tite Kubo…' },
  film:   { label: 'Réalisateur·ice',    placeholder: 'Christopher Nolan, Denis Villeneuve…' },
  series: { label: 'Créateur·ice',       placeholder: 'Vince Gilligan, David Chase…' },
  music:  { label: 'Artiste / Groupe',   placeholder: 'Radiohead, Queens of the Stone Age…' },
  game:   { label: 'Studio',             placeholder: 'FromSoftware, Naughty Dog…' },
}

const phase = ref('search')
const searchText = ref('')

const form = reactive({
  type: props.initialType ?? 'book',
  title: '',
  author: '',
  description: '',
  link: '',
  cover_url: null,
  rating: null,
  cdn_source: null,
  // Métadonnées
  synopsis: null,
  release_year: null,
  genres: null,
  page_count: null,
  publisher: null,
  isbn: null,
  language: null,
  status: null,
  volume_count: null,
  origin: null,
  duration: null,
  main_cast: null,
  season_count: null,
  platforms: null,
  track_count: null,
})

const loading = ref(false)
const errorMsg = ref('')
const hoverStar = ref(0)

// Champs tableaux affichés comme chaîne CSV
const genresInput = computed({
  get: () => Array.isArray(form.genres) ? form.genres.join(', ') : form.genres ?? '',
  set: (v) => { form.genres = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null },
})
const castInput = computed({
  get: () => Array.isArray(form.main_cast) ? form.main_cast.join(', ') : form.main_cast ?? '',
  set: (v) => { form.main_cast = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null },
})
const platformsInput = computed({
  get: () => Array.isArray(form.platforms) ? form.platforms.join(', ') : form.platforms ?? '',
  set: (v) => { form.platforms = v ? v.split(',').map((s) => s.trim()).filter(Boolean) : null },
})

const authorLabel = computed(() => AUTHOR_META[form.type]?.label ?? 'Auteur')
const authorPlaceholder = computed(() => AUTHOR_META[form.type]?.placeholder ?? '')
const coverSearchQuery = computed(() => [form.title, form.author].filter(Boolean).join(' '))

const matches = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return []
  return worksStore.works.filter((w) => w.title.toLowerCase().includes(q)).slice(0, 6)
})

function hasMyReview(work) { return work.my_review != null }

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}
function placeholderFor(work) {
  const hue = titleHash(work.title) % 360
  return `linear-gradient(145deg, hsl(${hue}, 40%, 22%), hsl(${hue}, 35%, 14%))`
}

function selectExisting(work) { emit('open-work', work); emit('close') }
function goToCreate() { form.title = searchText.value.trim(); phase.value = 'create' }

watch(() => form.type, () => { form.author = ''; form.cdn_source = null })
watch(() => form.cover_url, (val) => { if (!val) form.cdn_source = null })

function applyMetadata(meta) {
  if (meta.source) form.cdn_source = meta.source
  if (meta.title) form.title = meta.title
  if (meta.author) form.author = meta.author
  if (meta.description) form.synopsis = meta.description
  if (meta.release_year) form.release_year = meta.release_year
  if (meta.genres) form.genres = meta.genres
  if (meta.page_count) form.page_count = meta.page_count
  if (meta.publisher) form.publisher = meta.publisher
  if (meta.isbn) form.isbn = meta.isbn
  if (meta.language) form.language = meta.language
  if (meta.status) form.status = meta.status
  if (meta.volume_count) form.volume_count = meta.volume_count
  if (meta.origin) form.origin = meta.origin
  if (meta.duration) form.duration = meta.duration
  if (meta.main_cast) form.main_cast = meta.main_cast
  if (meta.season_count) form.season_count = meta.season_count
  if (meta.platforms) form.platforms = meta.platforms
  if (meta.track_count) form.track_count = meta.track_count
}

function pickerFill(i) {
  const val = hoverStar.value || form.rating || 0
  if (val >= i) return '100%'
  if (val >= i - 0.5) return '50%'
  return '0%'
}

async function submit() {
  errorMsg.value = ''
  loading.value = true
  try {
    await worksStore.create({
      title: form.title,
      author: form.author || undefined,
      type: form.type,
      synopsis: form.synopsis || undefined,
      description: form.description || undefined,
      link: form.link || undefined,
      cover_url: form.cover_url || undefined,
      rating: form.rating ?? undefined,
      cdn_source: form.cdn_source || undefined,
      release_year: form.release_year || undefined,
      genres: form.genres || undefined,
      page_count: form.page_count || undefined,
      publisher: form.publisher || undefined,
      isbn: form.isbn || undefined,
      language: form.language || undefined,
      status: form.status || undefined,
      volume_count: form.volume_count || undefined,
      origin: form.origin || undefined,
      duration: form.duration || undefined,
      main_cast: form.main_cast || undefined,
      season_count: form.season_count || undefined,
      platforms: form.platforms || undefined,
      track_count: form.track_count || undefined,
    })
    emit('created')
  } catch (e) {
    errorMsg.value = e.response?.data?.error ?? 'Erreur lors de la publication'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.modal-card {
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  background: #120800;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8);
  scrollbar-width: thin;
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
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 1rem;
  margin-bottom: 0;
}
.modal-header h2 {
  font-family: var(--font-serif);
  font-size: 1.3rem;
  color: var(--color-amber-lt);
}
.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
}
.modal-close:hover { background: var(--color-amber); color: #0d0600; }

/* Phase recherche */
.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.search-hint { font-size: 0.85rem; color: var(--color-text-muted); font-style: italic; text-align: center; padding: 1rem 0; }
.search-results { display: flex; flex-direction: column; gap: 0.5rem; }
.search-results__label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 0.2rem; }

.work-match {
  display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.8rem;
  background: rgba(255,255,255,0.03); border: 1px solid var(--color-border);
  border-radius: 8px; cursor: pointer; text-align: left;
  transition: border-color var(--transition), background var(--transition); width: 100%;
}
.work-match:hover { border-color: var(--color-amber); background: rgba(200,130,26,0.06); }
.work-match__cover { width: 36px; height: 52px; flex-shrink: 0; border-radius: 3px; overflow: hidden; }
.work-match__cover img { width: 100%; height: 100%; object-fit: cover; }
.work-match__cover-placeholder { width: 100%; height: 100%; }
.work-match__info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.work-match__title { font-family: var(--font-serif); font-size: 0.92rem; color: var(--color-text); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.work-match__meta { font-size: 0.75rem; color: var(--color-text-muted); }
.work-match__type { color: var(--color-amber); font-weight: 500; }
.work-match__reviewed { font-size: 0.7rem; color: var(--color-amber); background: rgba(200,130,26,0.12); padding: 0.1rem 0.45rem; border-radius: 4px; align-self: flex-start; }
.work-match__arrow { color: var(--color-text-muted); flex-shrink: 0; }

.create-new-btn {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: 0.7rem 0.8rem; border: 1px dashed var(--color-border); border-radius: 8px;
  color: var(--color-text-muted); font-size: 0.88rem; cursor: pointer;
  transition: border-color var(--transition), color var(--transition); text-align: left; margin-top: 0.25rem;
}
.create-new-btn:hover { border-color: var(--color-amber); color: var(--color-amber); }
.create-new-btn em { font-style: normal; color: var(--color-text); }

/* Phase création */
.modal-form { display: flex; flex-direction: column; gap: 1.2rem; padding: 1.5rem; }
.back-btn { align-self: flex-start; font-size: 0.8rem; color: var(--color-text-muted); background: transparent; padding: 0; transition: color var(--transition); }
.back-btn:hover { color: var(--color-text); }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field--grow { flex: 1; }
.field-row { display: flex; gap: 0.75rem; }
.field label { font-size: 0.78rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.field-hint { text-transform: none; opacity: 0.6; font-size: 0.7rem; }
.required { color: var(--color-amber); }
.field input, .field textarea, .field select {
  padding: 0.65rem 0.85rem; background: rgba(255,255,255,0.04); border: 1px solid var(--color-border);
  border-radius: 6px; color: var(--color-text); font-size: 0.9rem; resize: vertical;
  transition: border-color var(--transition);
}
.field select { cursor: pointer; }
.field select option { background: #120800; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--color-amber); outline: none; }
.field input::placeholder, .field textarea::placeholder { color: var(--color-text-muted); }

.type-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.type-pill {
  padding: 0.35rem 0.85rem; border-radius: 20px; border: 1px solid var(--color-border);
  background: transparent; color: var(--color-text-muted); font-size: 0.82rem; cursor: pointer;
  transition: all var(--transition);
}
.type-pill:hover { border-color: var(--color-amber); color: var(--color-amber); }
.type-pill.active { background: var(--color-amber); border-color: var(--color-amber); color: #0d0600; font-weight: 600; }

/* CDN badges */
.cdn-badge {
  font-size: 0.78rem; color: #4caf82; background: rgba(76,175,130,0.1);
  border: 1px solid rgba(76,175,130,0.3); border-radius: 6px; padding: 0.45rem 0.75rem;
}
.cdn-warning {
  font-size: 0.78rem; color: var(--color-amber); background: rgba(200,130,26,0.08);
  border: 1px solid rgba(200,130,26,0.25); border-radius: 6px; padding: 0.45rem 0.75rem;
}

/* Section métadonnées */
.meta-section {
  border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem;
  display: flex; flex-direction: column; gap: 0.9rem;
}
.meta-section__title {
  font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--color-amber); font-weight: 600; margin-bottom: 0.1rem;
}

/* Stars */
.star-picker { display: flex; align-items: center; gap: 2px; }
.star-slot { position: relative; display: inline-block; font-size: 1.5rem; line-height: 1; cursor: pointer; }
.half-zone { position: absolute; top: 0; bottom: 0; width: 50%; background: transparent; z-index: 2; }
.half-left { left: 0; }
.half-right { right: 0; }
.sp-bg { display: block; color: var(--color-border); }
.sp-fg { position: absolute; top: 0; left: 0; color: var(--color-amber); overflow: hidden; white-space: nowrap; pointer-events: none; }
.star-label { font-size: 0.8rem; color: var(--color-text-muted); margin-left: 8px; }

.form-error { font-size: 0.85rem; color: var(--color-error); padding: 0.5rem 0.8rem; background: rgba(224,80,80,0.1); border-radius: 6px; border: 1px solid rgba(224,80,80,0.2); }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.8rem; padding-top: 0.5rem; }
.btn-ghost { padding: 0.65rem 1.2rem; background: transparent; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-size: 0.9rem; transition: border-color var(--transition), color var(--transition); }
.btn-ghost:hover { border-color: var(--color-text); color: var(--color-text); }
.btn-primary { padding: 0.65rem 1.4rem; background: var(--color-amber); color: #0d0600; font-weight: 600; font-size: 0.9rem; border-radius: 8px; min-width: 90px; display: flex; align-items: center; justify-content: center; transition: background var(--transition); }
.btn-primary:hover:not(:disabled) { background: var(--color-amber-lt); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.spinner-sm { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(13,6,0,0.3); border-top-color: #0d0600; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 600px) {
  .field-row { flex-direction: column; }
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal-card { border-radius: 16px 16px 0 0; max-height: 95vh; }
}
</style>
