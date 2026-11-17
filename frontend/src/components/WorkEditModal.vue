<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Modifier l'œuvre</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>

      <form class="modal-form" @submit.prevent="submit">
        <!-- Type -->
        <div class="field">
          <label>Type</label>
          <div class="type-pills">
            <button v-for="t in TYPES" :key="t.value" type="button" class="type-pill"
              :class="{ active: form.type === t.value }" @click="form.type = t.value">{{ t.label }}</button>
          </div>
        </div>

        <div class="field-row">
          <div class="field field--grow">
            <label>Titre <span class="required">*</span></label>
            <input v-model="form.title" type="text" required />
          </div>
          <div class="field field--grow">
            <label>{{ authorLabel }}</label>
            <input v-model="form.author" type="text" :placeholder="authorPlaceholder" />
          </div>
        </div>

        <!-- Couverture -->
        <ImageSearchCarousel
          v-model="form.cover_url"
          :query="coverSearchQuery"
          :type="form.type"
          @select-metadata="applyMetadata"
        />

        <!-- Couverture URL manuelle -->
        <div class="field">
          <label>URL de la couverture</label>
          <input v-model="form.cover_url" type="url" placeholder="https://…" />
        </div>

        <!-- Champs communs -->
        <div class="meta-section">
          <h3 class="meta-section__title">Informations</h3>
          <div class="field-row">
            <div class="field">
              <label>Année</label>
              <input v-model.number="form.release_year" type="number" min="1800" max="2100" />
            </div>
            <div class="field field--grow">
              <label>Genres <span class="field-hint">(virgules)</span></label>
              <input v-model="genresInput" type="text" placeholder="Action, Drame…" />
            </div>
          </div>
          <div class="field">
            <label>Synopsis</label>
            <textarea v-model="form.description" rows="3" />
          </div>
          <div class="field">
            <label>Lien</label>
            <input v-model="form.link" type="url" placeholder="https://…" />
          </div>

          <!-- Livres -->
          <template v-if="form.type === 'book'">
            <div class="field-row">
              <div class="field"><label>Pages</label><input v-model.number="form.page_count" type="number" /></div>
              <div class="field field--grow"><label>Éditeur</label><input v-model="form.publisher" type="text" /></div>
            </div>
            <div class="field-row">
              <div class="field"><label>ISBN</label><input v-model="form.isbn" type="text" /></div>
              <div class="field"><label>Langue</label><input v-model="form.language" type="text" placeholder="fr, en, ja…" /></div>
            </div>
          </template>

          <!-- Mangas -->
          <template v-else-if="form.type === 'manga'">
            <div class="field-row">
              <div class="field"><label>Volumes</label><input v-model.number="form.volume_count" type="number" /></div>
              <div class="field">
                <label>Statut</label>
                <select v-model="form.status">
                  <option value="">—</option>
                  <option value="FINISHED">Terminé</option>
                  <option value="RELEASING">En cours</option>
                  <option value="HIATUS">En pause</option>
                </select>
              </div>
              <div class="field">
                <label>Origine</label>
                <select v-model="form.origin">
                  <option value="">—</option>
                  <option value="JP">Manga (JP)</option>
                  <option value="KR">Manhwa (KR)</option>
                  <option value="CN">Manhua (CN)</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Films -->
          <template v-else-if="form.type === 'film'">
            <div class="field-row">
              <div class="field"><label>Durée (min)</label><input v-model.number="form.duration" type="number" /></div>
              <div class="field field--grow">
                <label>Casting <span class="field-hint">(virgules)</span></label>
                <input v-model="castInput" type="text" />
              </div>
            </div>
          </template>

          <!-- Séries -->
          <template v-else-if="form.type === 'series'">
            <div class="field-row">
              <div class="field"><label>Saisons</label><input v-model.number="form.season_count" type="number" /></div>
              <div class="field"><label>Durée / épisode (min)</label><input v-model.number="form.duration" type="number" /></div>
              <div class="field">
                <label>Statut</label>
                <select v-model="form.status">
                  <option value="">—</option>
                  <option value="Ended">Terminée</option>
                  <option value="Returning Series">En cours</option>
                  <option value="Canceled">Annulée</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Casting <span class="field-hint">(virgules)</span></label>
              <input v-model="castInput" type="text" />
            </div>
          </template>

          <!-- Musique -->
          <template v-else-if="form.type === 'music'">
            <div class="field"><label>Pistes</label><input v-model.number="form.track_count" type="number" /></div>
          </template>

          <!-- Jeux -->
          <template v-else-if="form.type === 'game'">
            <div class="field"><label>Éditeur</label><input v-model="form.publisher" type="text" /></div>
            <div class="field">
              <label>Plateformes <span class="field-hint">(virgules)</span></label>
              <input v-model="platformsInput" type="text" />
            </div>
          </template>
        </div>

        <Transition name="fade">
          <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>
        </Transition>

        <div class="modal-footer">
          <button type="button" class="btn-ghost" @click="$emit('close')">Annuler</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="!loading">Enregistrer</span>
            <span v-else class="spinner-sm" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { adminApi } from '@/api/index.js'
import ImageSearchCarousel from './ImageSearchCarousel.vue'
import { ref } from 'vue'

const props = defineProps({ work: { type: Object, required: true } })
const emit = defineEmits(['close', 'saved'])

const TYPES = [
  { value: 'book', label: 'Livre' }, { value: 'manga', label: 'Manga' },
  { value: 'film', label: 'Film' }, { value: 'series', label: 'Série' },
  { value: 'music', label: 'Musique' }, { value: 'game', label: 'Jeu' },
]

const AUTHOR_META = {
  book: { label: 'Auteur', placeholder: '' }, manga: { label: 'Mangaka', placeholder: '' },
  film: { label: 'Réalisateur·ice', placeholder: '' }, series: { label: 'Créateur·ice', placeholder: '' },
  music: { label: 'Artiste / Groupe', placeholder: '' }, game: { label: 'Studio', placeholder: '' },
}

const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  title: props.work.title ?? '',
  author: props.work.author ?? '',
  type: props.work.type ?? 'book',
  cover_url: props.work.cover_url ?? null,
  link: props.work.link ?? null,
  cdn_source: props.work.cdn_source ?? null,
  description: props.work.description ?? null,
  release_year: props.work.release_year ?? null,
  genres: props.work.genres ?? null,
  page_count: props.work.page_count ?? null,
  publisher: props.work.publisher ?? null,
  isbn: props.work.isbn ?? null,
  language: props.work.language ?? null,
  status: props.work.status ?? null,
  volume_count: props.work.volume_count ?? null,
  origin: props.work.origin ?? null,
  duration: props.work.duration ?? null,
  main_cast: props.work.main_cast ?? null,
  season_count: props.work.season_count ?? null,
  platforms: props.work.platforms ?? null,
  track_count: props.work.track_count ?? null,
})

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

function applyMetadata(meta) {
  if (meta.source) form.cdn_source = meta.source
  if (meta.author && !form.author) form.author = meta.author
  if (meta.description && !form.description) form.description = meta.description
  if (meta.release_year && !form.release_year) form.release_year = meta.release_year
  if (meta.genres && !form.genres) form.genres = meta.genres
  if (meta.page_count && !form.page_count) form.page_count = meta.page_count
  if (meta.publisher && !form.publisher) form.publisher = meta.publisher
  if (meta.main_cast && !form.main_cast) form.main_cast = meta.main_cast
  if (meta.season_count && !form.season_count) form.season_count = meta.season_count
  if (meta.platforms && !form.platforms) form.platforms = meta.platforms
  if (meta.track_count && !form.track_count) form.track_count = meta.track_count
  if (meta.duration && !form.duration) form.duration = meta.duration
  if (meta.status && !form.status) form.status = meta.status
  if (meta.volume_count && !form.volume_count) form.volume_count = meta.volume_count
  if (meta.origin && !form.origin) form.origin = meta.origin
}

watch(() => form.cover_url, (val) => { if (!val) form.cdn_source = null })

async function submit() {
  errorMsg.value = ''
  loading.value = true
  try {
    const { data } = await adminApi.updateWork(props.work.id, { ...form })
    emit('saved', data)
  } catch (e) {
    errorMsg.value = e.response?.data?.error ?? 'Erreur lors de la sauvegarde'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.modal-card {
  width: 100%; max-width: 620px; max-height: 92vh; overflow-y: auto;
  background: #120800; border: 1px solid var(--color-border);
  border-radius: 14px; box-shadow: 0 30px 90px rgba(0,0,0,0.8); scrollbar-width: thin;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.5rem 1.5rem 1rem; position: sticky; top: 0; background: #120800;
  z-index: 1; border-bottom: 1px solid var(--color-border);
}
.modal-header h2 { font-family: var(--font-serif); font-size: 1.2rem; color: var(--color-amber-lt); }
.modal-close { width: 32px; height: 32px; border-radius: 50%; background: var(--color-border); color: var(--color-text); font-size: 0.85rem; display: flex; align-items: center; justify-content: center; transition: background var(--transition); }
.modal-close:hover { background: var(--color-amber); color: #0d0600; }

.modal-form { display: flex; flex-direction: column; gap: 1.1rem; padding: 1.5rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field--grow { flex: 1; }
.field-row { display: flex; gap: 0.75rem; }
.field label { font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.field-hint { text-transform: none; opacity: 0.6; font-size: 0.7rem; }
.required { color: var(--color-amber); }
.field input, .field textarea, .field select {
  padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.04); border: 1px solid var(--color-border);
  border-radius: 6px; color: var(--color-text); font-size: 0.88rem; resize: vertical;
  transition: border-color var(--transition);
}
.field select option { background: #120800; }
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--color-amber); outline: none; }
.field input::placeholder, .field textarea::placeholder { color: var(--color-text-muted); }

.type-pills { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.type-pill { padding: 0.3rem 0.75rem; border-radius: 20px; border: 1px solid var(--color-border); background: transparent; color: var(--color-text-muted); font-size: 0.8rem; cursor: pointer; transition: all var(--transition); }
.type-pill:hover { border-color: var(--color-amber); color: var(--color-amber); }
.type-pill.active { background: var(--color-amber); border-color: var(--color-amber); color: #0d0600; font-weight: 600; }

.meta-section { border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
.meta-section__title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-amber); font-weight: 600; }

.form-error { font-size: 0.85rem; color: var(--color-error); padding: 0.5rem 0.8rem; background: rgba(224,80,80,0.1); border-radius: 6px; border: 1px solid rgba(224,80,80,0.2); }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.8rem; padding-top: 0.5rem; }
.btn-ghost { padding: 0.6rem 1.2rem; background: transparent; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-size: 0.88rem; transition: border-color var(--transition), color var(--transition); }
.btn-ghost:hover { border-color: var(--color-text); color: var(--color-text); }
.btn-primary { padding: 0.6rem 1.4rem; background: var(--color-amber); color: #0d0600; font-weight: 600; font-size: 0.88rem; border-radius: 8px; min-width: 90px; display: flex; align-items: center; justify-content: center; transition: background var(--transition); }
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
