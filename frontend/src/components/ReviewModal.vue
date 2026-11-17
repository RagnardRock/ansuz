<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" :aria-labelledby="'review-modal-title'" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 id="review-modal-title">{{ review ? 'Modifier mon avis' : 'Donner mon avis' }}</h2>
        <button class="modal-close" aria-label="Fermer" @click="$emit('close')">✕</button>
      </div>

      <form class="modal-form" @submit.prevent="submit">
        <div class="field">
          <label id="star-picker-label">Note</label>
          <div class="star-picker" role="group" aria-labelledby="star-picker-label">
            <div v-for="i in 5" :key="i" class="star-slot">
              <button
                type="button"
                class="half-zone half-left"
                :aria-label="`${i - 0.5} étoiles`"
                @mouseenter="hoverStar = i - 0.5"
                @mouseleave="hoverStar = 0"
                @click="form.rating = form.rating === i - 0.5 ? null : i - 0.5"
              />
              <button
                type="button"
                class="half-zone half-right"
                :aria-label="`${i} étoiles`"
                @mouseenter="hoverStar = i"
                @mouseleave="hoverStar = 0"
                @click="form.rating = form.rating === i ? null : i"
              />
              <span class="sp-bg">★</span>
              <span class="sp-fg" :style="{ width: pickerFill(i) }">★</span>
            </div>
            <span v-if="form.rating" class="star-label">{{ form.rating }}/5</span>
          </div>
        </div>

        <div class="field">
          <label for="desc">Ton avis</label>
          <textarea
            id="desc"
            v-model="form.description"
            rows="4"
            placeholder="Ce que tu en as pensé, pourquoi tu le recommandes…"
          />
        </div>

        <Transition name="fade">
          <p v-if="errorMsg" class="form-error" role="alert">{{ errorMsg }}</p>
        </Transition>

        <div class="modal-footer">
          <button type="button" class="btn-ghost" @click="$emit('close')">Annuler</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="!loading">{{ review ? 'Enregistrer' : 'Publier' }}</span>
            <span v-else class="spinner-sm" />
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { reviewsApi, worksApi } from '@/api/index.js'

const props = defineProps({
  workId: { type: String, required: true },
  review: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])

const form = reactive({
  rating: props.review?.rating ?? null,
  description: props.review?.description ?? '',
})

const loading = ref(false)
const errorMsg = ref('')
const hoverStar = ref(0)

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
    const payload = {
      rating: form.rating ?? undefined,
      description: form.description || undefined,
    }
    let saved
    if (props.review) {
      const { data } = await reviewsApi.update(props.review.id, payload)
      saved = data
    } else {
      const { data } = await worksApi.addReview(props.workId, payload)
      saved = data
    }
    emit('saved', saved)
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
  z-index: 300;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.modal-card {
  width: 100%;
  max-width: 440px;
  background: #120800;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 0;
}
.modal-header h2 {
  font-family: var(--font-serif);
  font-size: 1.2rem;
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
.modal-close:hover {
  background: var(--color-amber);
  color: #0d0600;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.field textarea {
  padding: 0.65rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  resize: vertical;
  transition: border-color var(--transition);
}
.field textarea:focus {
  border-color: var(--color-amber);
  outline: none;
}
.field textarea::placeholder {
  color: var(--color-text-muted);
}
.star-picker {
  display: flex;
  align-items: center;
  gap: 2px;
}
.star-slot {
  position: relative;
  display: inline-block;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.half-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  background: transparent;
  z-index: 2;
}
.half-left { left: 0; }
.half-right { right: 0; }
.sp-bg {
  display: block;
  color: var(--color-border);
}
.sp-fg {
  position: absolute;
  top: 0;
  left: 0;
  color: var(--color-amber);
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
}
.star-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-left: 8px;
}
.form-error {
  font-size: 0.85rem;
  color: var(--color-error);
  padding: 0.5rem 0.8rem;
  background: rgba(224, 80, 80, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(224, 80, 80, 0.2);
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  padding-top: 0.5rem;
}
.btn-ghost {
  padding: 0.65rem 1.2rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  transition: border-color var(--transition), color var(--transition);
}
.btn-ghost:hover {
  border-color: var(--color-text);
  color: var(--color-text);
}
.btn-primary {
  padding: 0.65rem 1.4rem;
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 8px;
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
}
.btn-primary:hover:not(:disabled) {
  background: var(--color-amber-lt);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.spinner-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(13, 6, 0, 0.3);
  border-top-color: #0d0600;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
