<template>
  <section class="carousel-section">
    <h2 class="carousel-title">{{ title }}</h2>
    <div v-if="works.length === 0" class="carousel-empty">Aucune œuvre pour l'instant.</div>
    <div v-else class="carousel-track" ref="trackRef">
      <Book
        v-for="work in works"
        :key="work.id"
        :work="work"
        @open="$emit('open', work)"
      />
    </div>
  </section>
</template>

<script setup>
import Book from './Book.vue'

defineProps({
  title: { type: String, required: true },
  works: { type: Array, default: () => [] },
})
defineEmits(['open'])
</script>

<style scoped>
.carousel-section { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; width: 100%; }

.carousel-title {
  font-family: var(--font-serif);
  font-size: 1rem;
  font-weight: 400;
  font-style: italic;
  color: var(--color-amber-lt);
  padding-left: 0.25rem;
}

.carousel-track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0.5rem 0.25rem 1rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.carousel-track::-webkit-scrollbar { height: 4px; }
.carousel-track::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

/* Items réduits à 0.6× */
.carousel-track :deep(.book-scene) {
  --w: 75px;
  --h: 110px;
  --t: 15px;
  width: calc(var(--w) + 14px);
}
.carousel-track :deep(.book-label) {
  width: calc(var(--w) + 14px);
}
.carousel-track :deep(.nes-cart__body) {
  width: var(--w);
  height: var(--w);
}
.carousel-track :deep(.nes-cart__stub) {
  height: calc(var(--w) / 5);
}

.carousel-empty {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  font-style: italic;
  padding: 1rem 0.25rem;
}
</style>
