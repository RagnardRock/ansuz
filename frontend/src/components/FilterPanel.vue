<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="modelValue" class="fp-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="fp-panel">
          <div class="fp-header">
            <span class="fp-title">Filtres</span>
            <button class="fp-close" @click="$emit('update:modelValue', false)">✕</button>
          </div>

          <div class="fp-body">

            <!-- Genres -->
            <div v-if="facets.genres?.length" class="fp-section">
              <p class="fp-label">Genres</p>
              <div class="fp-chips fp-chips--scroll">
                <button
                  v-for="genre in facets.genres" :key="genre"
                  class="fp-chip" :class="{ active: filters.genres?.includes(genre) }"
                  @click="toggleArray('genres', genre)"
                >{{ genre }}</button>
              </div>
            </div>

            <!-- Année -->
            <div class="fp-section">
              <p class="fp-label">Année</p>
              <div class="fp-year-range">
                <input
                  :value="filters.yearFrom"
                  class="fp-year-input"
                  type="number"
                  placeholder="De"
                  min="1800" max="2100"
                  @input="emit('update:filters', { ...filters, yearFrom: $event.target.value ? parseInt($event.target.value) : null })"
                />
                <span class="fp-year-sep">–</span>
                <input
                  :value="filters.yearTo"
                  class="fp-year-input"
                  type="number"
                  placeholder="À"
                  min="1800" max="2100"
                  @input="emit('update:filters', { ...filters, yearTo: $event.target.value ? parseInt($event.target.value) : null })"
                />
              </div>
            </div>

            <!-- Note minimum -->
            <div class="fp-section">
              <p class="fp-label">Note minimum</p>
              <div class="fp-chips">
                <button
                  v-for="opt in RATING_OPTS" :key="opt.value"
                  class="fp-chip" :class="{ active: filters.minRating === opt.value }"
                  @click="toggle('minRating', opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <!-- Langue -->
            <div v-if="facets.languages?.length" class="fp-section">
              <p class="fp-label">Langue</p>
              <div class="fp-chips">
                <button
                  v-for="lang in facets.languages" :key="lang"
                  class="fp-chip" :class="{ active: filters.language === lang }"
                  @click="toggle('language', lang)"
                >{{ lang }}</button>
              </div>
            </div>

            <!-- Statut -->
            <div v-if="facets.statuses?.length" class="fp-section">
              <p class="fp-label">Statut</p>
              <div class="fp-chips">
                <button
                  v-for="s in facets.statuses" :key="s"
                  class="fp-chip" :class="{ active: filters.status === s }"
                  @click="toggle('status', s)"
                >{{ STATUS_LABELS[s] ?? s }}</button>
              </div>
            </div>

            <!-- Origine -->
            <div v-if="facets.origins?.length" class="fp-section">
              <p class="fp-label">Origine</p>
              <div class="fp-chips">
                <button
                  v-for="o in facets.origins" :key="o"
                  class="fp-chip" :class="{ active: filters.origin === o }"
                  @click="toggle('origin', o)"
                >{{ o }}</button>
              </div>
            </div>

            <!-- Plateformes -->
            <div v-if="facets.platforms?.length" class="fp-section">
              <p class="fp-label">Plateforme</p>
              <div class="fp-chips">
                <button
                  v-for="p in facets.platforms" :key="p"
                  class="fp-chip" :class="{ active: filters.platforms?.includes(p) }"
                  @click="toggleArray('platforms', p)"
                >{{ p }}</button>
              </div>
            </div>

          </div>

          <div class="fp-footer">
            <button class="fp-reset" @click="$emit('reset')">Réinitialiser</button>
            <button class="fp-apply" @click="$emit('update:modelValue', false)">Fermer</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const STATUS_LABELS = {
  FINISHED: 'Terminé', RELEASING: 'En cours', NOT_YET_RELEASED: 'À venir',
  CANCELLED: 'Annulé', HIATUS: 'En pause', ENDED: 'Terminé', RETURNING_SERIES: 'En cours',
}
const RATING_OPTS = [
  { label: '≥ 2★', value: 2 },
  { label: '≥ 3★', value: 3 },
  { label: '≥ 4★', value: 4 },
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  facets: { type: Object, default: () => ({}) },
  filters: { type: Object, required: true },
})
const emit = defineEmits(['update:modelValue', 'update:filters', 'reset'])

function toggle(key, value) {
  emit('update:filters', { ...props.filters, [key]: props.filters[key] === value ? null : value })
}

function toggleArray(key, value) {
  const current = props.filters[key] ?? []
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  emit('update:filters', { ...props.filters, [key]: next.length ? next : null })
}
</script>

<style scoped>
.fp-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
  z-index: 300; display: flex; justify-content: flex-end;
}
.fp-panel {
  width: 340px; max-width: 90vw; height: 100%;
  background: var(--color-surface); border-left: 1px solid var(--color-border);
  display: flex; flex-direction: column; overflow: hidden;
}
.fp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.fp-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text); }
.fp-close {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--color-border);
  color: var(--color-text-muted); font-size: 0.75rem;
  transition: background var(--transition), color var(--transition);
}
.fp-close:hover { background: var(--color-amber); color: #0d0600; border-color: var(--color-amber); }

.fp-body {
  flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem;
  display: flex; flex-direction: column; gap: 1.5rem;
}
.fp-label {
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 0.6rem;
}
.fp-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.fp-chips--scroll {
  max-height: 150px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--color-border) transparent;
  padding-right: 2px;
}
.fp-chips--scroll::-webkit-scrollbar { width: 4px; }
.fp-chips--scroll::-webkit-scrollbar-track { background: transparent; }
.fp-chips--scroll::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }
.fp-chip {
  font-size: 0.78rem; padding: 0.3rem 0.7rem; border-radius: 20px;
  border: 1px solid var(--color-border); color: var(--color-text-muted);
  transition: all var(--transition);
}
.fp-chip:hover { border-color: var(--color-amber); color: var(--color-amber-lt); }
.fp-chip.active { background: rgba(200, 130, 26, 0.15); border-color: var(--color-amber); color: var(--color-amber-lt); }

.fp-year-range { display: flex; align-items: center; gap: 0.4rem; }
.fp-year-input {
  width: 80px; padding: 0.4rem 0.5rem;
  background: rgba(255, 255, 255, 0.04); border: 1px solid var(--color-border);
  border-radius: 6px; color: var(--color-text); font-size: 0.82rem;
  transition: border-color var(--transition);
}
.fp-year-input:focus { border-color: var(--color-amber); outline: none; }
.fp-year-input::placeholder { color: var(--color-text-muted); }
.fp-year-sep { font-size: 0.8rem; color: var(--color-text-muted); }

.fp-footer {
  padding: 1rem 1.5rem; border-top: 1px solid var(--color-border);
  display: flex; gap: 0.75rem; flex-shrink: 0;
}
.fp-reset {
  flex: 1; padding: 0.55rem; border-radius: 8px;
  border: 1px solid var(--color-border); color: var(--color-text-muted);
  font-size: 0.82rem; transition: all var(--transition);
}
.fp-reset:hover { border-color: var(--color-text-muted); color: var(--color-text); }
.fp-apply {
  flex: 2; padding: 0.55rem; border-radius: 8px;
  background: var(--color-amber); color: #0d0600;
  font-size: 0.82rem; font-weight: 600; transition: background var(--transition);
}
.fp-apply:hover { background: var(--color-amber-lt); }

.panel-enter-active, .panel-leave-active { transition: opacity 0.2s; }
.panel-enter-active .fp-panel, .panel-leave-active .fp-panel { transition: transform 0.25s; }
.panel-enter-from, .panel-leave-to { opacity: 0; }
.panel-enter-from .fp-panel, .panel-leave-to .fp-panel { transform: translateX(100%); }
</style>
