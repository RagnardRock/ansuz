<template>
  <div class="star-display" :class="`star-display--${size}`">
    <span v-for="i in 5" :key="i" class="sd-wrap">
      <span class="sd-bg">★</span>
      <span class="sd-fg" :style="{ width: fillFor(i) }">★</span>
    </span>
  </div>
</template>

<script setup>
const props = defineProps({
  rating: { type: Number, default: 0 },
  size: { type: String, default: 'md' },
})

function fillFor(i) {
  if (!props.rating) return '0%'
  if (props.rating >= i) return '100%'
  if (props.rating >= i - 0.5) return '50%'
  return '0%'
}
</script>

<style scoped>
.star-display {
  display: flex;
  gap: 1px;
}

.sd-wrap {
  position: relative;
  display: inline-block;
}
.sd-bg {
  display: block;
  color: rgba(255, 255, 255, 0.15);
}
.sd-fg {
  position: absolute;
  top: 0;
  left: 0;
  color: var(--color-amber);
  overflow: hidden;
  white-space: nowrap;
  pointer-events: none;
}

.star-display--sm .sd-wrap {
  font-size: 0.6rem;
}
.star-display--md .sd-wrap {
  font-size: 1rem;
}
.star-display--lg .sd-wrap {
  font-size: 1.2rem;
}
</style>
