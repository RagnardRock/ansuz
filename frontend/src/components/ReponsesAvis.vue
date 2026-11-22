<template>
  <div class="rep">
    <p v-if="chargement" class="rep__info">Chargement…</p>
    <p v-else-if="erreurChargement" class="rep__info">{{ erreurChargement }}</p>
    <ul v-else-if="reponses.length" class="rep__liste">
      <li v-for="r in reponses" :key="r.id" class="rep__item">
        <div class="rep__tete">
          <router-link :to="{ name: 'profile', params: { username: r.username } }" class="rep__auteur" @click.stop>
            {{ r.username }}
          </router-link>
          <span class="rep__date">· {{ depuis(r.created_at) }}</span>
          <button v-if="r.user_id === auth.user?.id || auth.user?.is_admin" type="button" class="rep__suppr"
            :aria-label="`Supprimer la réponse de ${r.username}`" @click="supprimer(r)">Supprimer</button>
        </div>
        <p class="rep__texte">{{ r.body }}</p>
      </li>
    </ul>

    <form v-if="auth.isLoggedIn" class="rep__form" @submit.prevent="envoyer">
      <label :for="idChamp" class="rep__cache">Ta réponse à {{ review.username }}</label>
      <textarea :id="idChamp" ref="champ" v-model="texte" rows="2" maxlength="2000" class="rep__champ"
        :placeholder="`Répondre à ${review.username}…`" @keydown.ctrl.enter="envoyer" @keydown.meta.enter="envoyer" />
      <div class="rep__actions">
        <p v-if="erreur" class="rep__erreur" role="alert">{{ erreur }}</p>
        <button type="submit" class="rep__envoyer" :disabled="envoi || !texte.trim()">Envoyer</button>
      </div>
    </form>
    <p v-else class="rep__info">
      <router-link :to="{ name: 'auth' }">Connecte-toi</router-link> pour répondre.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { reviewsApi } from '@/api/index.js'
import { useAuthStore } from '@/stores/auth.js'

const props = defineProps({ review: { type: Object, required: true } })
const emit = defineEmits(['count'])

const auth = useAuthStore()
const reponses = ref([])
const chargement = ref(true)
const erreurChargement = ref('')
const texte = ref('')
const envoi = ref(false)
const erreur = ref('')
const champ = ref(null)
const idChamp = `rep-${props.review.id}`

onMounted(async () => {
  try {
    const { data } = await reviewsApi.getReplies(props.review.id)
    reponses.value = data
    emit('count', data.length)
  } catch {
    erreurChargement.value = 'Réponses non chargées.'
  } finally { chargement.value = false }
  if (auth.isLoggedIn) { await nextTick(); champ.value?.focus() }
})

async function envoyer() {
  const t = texte.value.trim()
  if (!t || envoi.value) return
  envoi.value = true
  erreur.value = ''
  try {
    const { data } = await reviewsApi.addReply(props.review.id, t)
    reponses.value.push(data)
    texte.value = ''
    emit('count', reponses.value.length)
  } catch (e) {
    erreur.value = e.response?.data?.error ?? 'Envoi impossible, réessaie.'
  } finally { envoi.value = false }
}

async function supprimer(r) {
  if (!confirm('Supprimer cette réponse ?')) return
  try {
    await reviewsApi.removeReply(r.id)
    reponses.value = reponses.value.filter((x) => x.id !== r.id)
    emit('count', reponses.value.length)
  } catch {
    erreur.value = 'Suppression impossible, réessaie.'
  }
}

function depuis(date) {
  const s = (Date.now() - new Date(date).getTime()) / 1000
  if (s < 60) return 'à l\'instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 86400 * 30) return `il y a ${Math.floor(s / 86400)} j`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.rep { margin: 0.35rem 0 0 0.6rem; padding-left: 0.75rem; border-left: 2px solid rgba(180,140,80,0.35); display: flex; flex-direction: column; gap: 0.55rem; }
.rep__liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.55rem; }
.rep__tete { display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap; }
.rep__auteur { font-size: 0.78rem; font-weight: 600; color: #3d2510; }
.rep__auteur:hover { color: #c8821a; }
.rep__date { font-size: 0.7rem; color: #a08060; }
.rep__suppr { margin-left: auto; font-size: 0.68rem; color: #b04040; background: transparent; text-decoration: underline; opacity: 0.6; }
.rep__suppr:hover { opacity: 1; }
.rep__texte { margin: 0.1rem 0 0; font-size: 0.8rem; line-height: 1.5; color: #5c3a1e; white-space: pre-line; overflow-wrap: anywhere; }
.rep__info { margin: 0; font-size: 0.75rem; color: #8a6a40; }
.rep__info a { color: #c8821a; text-decoration: underline; }
.rep__form { display: flex; flex-direction: column; gap: 0.4rem; }
.rep__champ {
  width: 100%; box-sizing: border-box; resize: vertical; min-height: 2.6rem;
  padding: 0.5rem 0.6rem; border-radius: 8px; font: inherit; font-size: 0.8rem;
  border: 1px solid rgba(180,140,80,0.4); background: #fffaf0; color: #2a1a08;
}
.rep__champ:focus { outline: 2px solid rgba(200,130,26,0.5); outline-offset: 0; }
.rep__actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; }
.rep__erreur { margin: 0 auto 0 0; font-size: 0.72rem; color: #b03030; }
.rep__envoyer { min-height: 34px; padding: 0 0.9rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600; background: var(--color-amber); color: #0d0600; }
.rep__envoyer:disabled { opacity: 0.5; }
.rep__cache { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
