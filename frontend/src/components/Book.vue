<template>
  <div
    class="book-scene"
    role="button"
    tabindex="0"
    :aria-label="`Ouvrir ${work.title}`"
    @click="handleClick"
    @dblclick.stop.prevent="handleDblClick"
    @mouseenter="preloadCover"
    @keydown.enter.prevent="$emit('open', work)"
    @keydown.space.prevent="$emit('open', work)"
  >
    <!-- Cartouche NES pour les jeux -->
    <div v-if="work.type === 'game'" class="nes-cart">
      <div class="nes-cart__body">
        <div class="nes-cart__label">
          <img v-if="work.cover_url && !imgError" :src="work.cover_url" :alt="work.title" loading="lazy" @error="onImgError" />
          <div v-else class="nes-cart__ph" :style="{ background: placeholderGradient }">
            <span>{{ work.title }}</span>
            <span class="book__placeholder-glyph">{{ glyph }}</span>
          </div>
        </div>
      </div>
      <div class="nes-cart__stub"></div>
      <div class="nes-cart__ridges"></div>
    </div>

    <!-- Tous les autres types -->
    <div v-else class="book" :class="{
      'book--manga': work.type === 'manga',
      'book--dvd': work.type === 'film' || work.type === 'series',
      'book--album': work.type === 'music',
    }">
      <div class="book__cover">
        <img
          v-if="work.cover_url && !imgError"
          :src="work.cover_url"
          :alt="work.title"
          loading="lazy"
          @error="onImgError"
        />
        <div v-else class="book__placeholder" :style="{ background: placeholderGradient }">
          <span class="book__placeholder-title">{{ work.title }}</span>
          <span class="book__placeholder-glyph">{{ glyph }}</span>
        </div>
        <div class="book__spine-shadow" />
      </div>
      <div class="book__pages" />
    </div>

    <div class="book-label">
      <span class="book-label__title">{{ work.title }}</span>
      <div class="book-label__meta">
        <StarDisplay v-if="work.avg_rating" :rating="work.avg_rating" size="sm" />
        <span v-if="work.review_count > 0" class="book-label__count">
          {{ work.review_count }} avis
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StarDisplay from './StarDisplay.vue'
import { useAnimationPref } from '@/composables/useAnimationPref.js'

const { skipNextAnimation } = useAnimationPref()

const props = defineProps({
  work: { type: Object, required: true },
})
const emit = defineEmits(['open'])

let clickTimer = null

function handleClick() {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    clickTimer = null
    emit('open', props.work)
  }, 150)
}

function handleDblClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  skipNextAnimation()
  emit('open', props.work)
}

function preloadCover() {
  if (props.work.cover_url) {
    const img = new Image()
    img.src = props.work.cover_url
  }
}

const imgError = ref(false)
let imgRetried = false

function onImgError(e) {
  if (!imgRetried) {
    imgRetried = true
    const src = e.target.src
    e.target.src = ''
    setTimeout(() => {
      e.target.src = src
    }, 1500)
  } else {
    imgError.value = true
  }
}

const glyphPool = ['❧', '§', '◈', '❦', '✦', '⊕', '∞', '⋆', '◉']

function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

const hue = computed(() => titleHash(props.work.title) % 360)
const placeholderGradient = computed(
  () => `linear-gradient(145deg, hsl(${hue.value}, 40%, 22%) 0%, hsl(${hue.value}, 35%, 14%) 100%)`
)
const glyph = computed(() => glyphPool[titleHash(props.work.title) % glyphPool.length])
</script>

<style scoped>
.book-scene {
  --w: 150px;
  --h: 220px;
  --t: 30px;

  width: calc(var(--w) + 20px);
  perspective: 1200px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: auto;
}

.book {
  position: relative;
  width: var(--w);
  height: var(--h);
  flex-shrink: 0;
  transform-style: preserve-3d;
  transform: rotateY(-30deg) rotateX(3deg);
  transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.book--manga {
  transform: rotateY(30deg) rotateX(3deg);
}

.book-scene:hover .book {
  transform: rotateY(-35deg) rotateX(2deg) translateY(-12px);
}
.book-scene:hover .book--manga {
  transform: rotateY(35deg) rotateX(2deg) translateY(-12px);
}
.book-scene:hover .book__cover {
  filter: brightness(1.12);
}

.book__cover {
  position: absolute;
  inset: 0;
  transform: translateZ(calc(var(--t) / 2));
  border-radius: 2px 5px 5px 2px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
}
.book__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.book__spine-shadow {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.1) 9%, transparent 22%);
  pointer-events: none;
}
.book--manga .book__spine-shadow {
  background: linear-gradient(to left, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.1) 9%, transparent 22%);
}

.book__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
}
.book__placeholder-title {
  font-family: var(--font-serif);
  font-size: 0.88rem;
  color: rgba(255, 220, 170, 0.9);
  text-align: center;
  line-height: 1.3;
  font-style: italic;
}
.book__placeholder-glyph {
  font-size: 1.8rem;
  color: rgba(255, 220, 170, 0.25);
}

.book__pages {
  position: absolute;
  top: 3px;
  left: var(--w);
  width: var(--t);
  height: calc(100% - 6px);
  transform-origin: left center;
  transform: translateZ(calc(var(--t) / 2)) rotateY(90deg);
  background: repeating-linear-gradient(to bottom, #f4ead6 0px, #f4ead6 2px, #e6d4b0 2px, #e6d4b0 3px);
  border-radius: 0 2px 2px 0;
  box-shadow: inset -2px 0 6px rgba(0, 0, 0, 0.15);
}
.book--manga .book__pages {
  left: auto;
  right: var(--w);
  transform-origin: right center;
  transform: translateZ(calc(var(--t) / 2)) rotateY(-90deg);
  border-radius: 2px 0 0 2px;
}

/* ── Film → boîtier DVD ── */
.book--dvd { --t: 18px; transform: rotateY(-20deg) rotateX(3deg); }
.book-scene:hover .book--dvd { transform: rotateY(-25deg) rotateX(2deg) translateY(-12px); }
.book--dvd .book__cover { border-radius: 3px 5px 5px 3px; }
.book--dvd .book__spine-shadow {
  background: linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 5%, transparent 15%);
}
.book--dvd .book__pages {
  background: #0d0d1a;
  border-radius: 0 1px 1px 0;
  box-shadow: none;
}


/* ── Musique → pochette carré ── */
.book--album { --h: var(--w); --t: 8px; transform: rotateY(-18deg) rotateX(3deg); }
.book-scene:hover .book--album { transform: rotateY(-22deg) rotateX(2deg) translateY(-10px); }
.book--album .book__cover { border-radius: 2px; }
.book--album .book__spine-shadow {
  background: linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 5%, transparent 14%);
}
.book--album .book__pages { background: #1a1a1a; border-radius: 0; box-shadow: none; }

/* ── Jeu → Cartouche NES ── */
.nes-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  transform: rotateY(-20deg) rotateX(4deg);
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-style: preserve-3d;
}
.book-scene:hover .nes-cart { transform: rotateY(-25deg) rotateX(2deg) translateY(-10px); }

/* Corps principal */
.nes-cart__body {
  width: var(--w);
  height: var(--w);
  background: #a8a8a8;
  border-radius: 3px 3px 1px 1px;
  position: relative;
  box-shadow: 3px 5px 14px rgba(0,0,0,0.5);
  transform-style: preserve-3d;
  transform: translateZ(8px);
}
/* Tranche droite */
.nes-cart__body::after {
  content: '';
  position: absolute;
  top: 0; left: 100%;
  width: 16px; height: 100%;
  background: linear-gradient(to right, #7a7a7a, #606060);
  transform-origin: left center;
  transform: rotateY(90deg);
  border-radius: 0 3px 3px 0;
}
/* Languette hachurée gauche — élément dédié pour éviter le clipping 3D */
.nes-cart__ridges {
  position: absolute;
  left: 11px; width: 20%; height: calc(var(--w) * 1.2);
  top: 0;
  border-radius: 3px 0 0 1px;
  background: repeating-linear-gradient(to right, #8a8a8a 0px, #8a8a8a 3px, #bcbcbc 3px, #bcbcbc 7px);
  transform: translateZ(9px);
  pointer-events: none;

}

/* Label : droite du corps */
.nes-cart__label {
  position: absolute;
  left: 28%; right: 3%;
  top: 4%; bottom: 4%;
  border-radius: 2px; overflow: hidden;
  background: #111; z-index: 1;
}
.nes-cart__label img { width: 100%; height: 100%; object-fit: cover; display: block; }
.nes-cart__ph {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.4rem; padding: 0.5rem;
  font-family: var(--font-serif); font-style: italic;
  font-size: 0.72rem; color: rgba(255,220,170,0.85); text-align: center;
}

/* Stub connecteur centré en bas */
.nes-cart__stub {
  width: 88%;
  height: calc(var(--w) / 5);
  background: #909090;
  border-radius: 0 0 3px 3px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.4);
  z-index: 1;
  transform: translateZ(8px);
  position: relative;
  transform-style: preserve-3d;
}
.nes-cart__stub::after {
  content: '';
  position: absolute;
  top: 0; left: 100%;
  width: 16px; height: 100%;
  background: linear-gradient(to right, #7a7a7a, #606060);
  transform-origin: left center;
  transform: rotateY(90deg);
  border-radius: 0 0 3px 0;
}

.book-label {
  margin-top: 0.65rem;
  width: calc(var(--w) + 20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.book-label__title {
  font-family: var(--font-serif);
  font-size: 0.78rem;
  color: rgba(255, 220, 170, 0.75);
  font-style: italic;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  height: calc(2 * 0.78rem * 1.3);
  text-align: center;
}
.book-label__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.book-label__count {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

@media (max-width: 768px) {
  .book-scene {
    --w: 90px;
    --h: 135px;
    --t: 22px;
    width: calc(var(--w) + 14px);
  }
  .book-label {
    width: calc(var(--w) + 14px);
  }
}
</style>
