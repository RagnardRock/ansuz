import { ref } from 'vue'

const enabled = ref(localStorage.getItem('animations') !== 'false')
const skipNext = ref(false)

export function useAnimationPref() {
  function toggle() {
    enabled.value = !enabled.value
    localStorage.setItem('animations', enabled.value ? 'true' : 'false')
  }
  function skipNextAnimation() { skipNext.value = true }
  function consumeSkip() {
    const val = skipNext.value
    skipNext.value = false
    return val
  }
  return { animationsEnabled: enabled, toggle, skipNextAnimation, consumeSkip, skipNext }
}
