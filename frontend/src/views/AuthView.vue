<template>
  <div class="auth-page">
    <div class="auth-card">
      <router-link to="/" class="auth-back">← Accueil</router-link>
      <h1 class="auth-logo">Ansuz</h1>
      <p class="auth-tagline">La médiathèque de vos cercles</p>

      <!-- Tabs login / register -->
      <div class="auth-tabs" role="tablist">
        <button role="tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          Se connecter
        </button>
        <button role="tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          S'inscrire
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <!-- Champ username uniquement à l'inscription -->
        <Transition name="slide">
          <div v-if="mode === 'register'" class="field">
            <label for="username">Nom d'utilisateur</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              placeholder="ex : alice"
              autocomplete="username"
              required
            />
          </div>
        </Transition>

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="toi@exemple.fr"
            autocomplete="email"
            required
          />
        </div>

        <div class="field">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
            minlength="8"
          />
        </div>

        <Transition name="fade">
          <p v-if="errorMsg" class="auth-error" role="alert">{{ errorMsg }}</p>
        </Transition>

        <button type="submit" class="auth-submit" :disabled="loading">
          <span v-if="!loading">{{ mode === 'login' ? 'Entrer' : 'Créer mon compte' }}</span>
          <span v-else class="spinner" aria-label="Chargement…" />
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const auth = useAuthStore()
const route = useRoute()
const mode = ref(route.query.mode === 'register' ? 'register' : 'login')
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({ username: '', email: '', password: '' })

watch(mode, () => {
  errorMsg.value = ''
})

async function submit() {
  errorMsg.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.email, form.password)
    } else {
      await auth.register(form.username, form.email, form.password)
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.error ?? 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 1rem;
  overflow: hidden;
  background: transparent;
}


.auth-page::after {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(200, 130, 26, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

@media (max-width: 480px) {
  .auth-page { padding: 0; align-items: flex-end; }
  .auth-card {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    min-height: 85vh;
  }
}

/* Carte centrale */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  background: rgba(10, 5, 1, 0.55);
  border: 1px solid rgba(200, 130, 26, 0.18);
  border-top: 1px solid rgba(200, 130, 26, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(200, 130, 26, 0.12);
}

.auth-back {
  display: block;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
  transition: color var(--transition);
}
.auth-back:hover { color: var(--color-amber); }

.auth-logo {
  font-family: var(--font-serif);
  font-size: 1.8rem;
  color: var(--color-amber-lt);
  text-align: center;
  letter-spacing: 0.02em;
}
.auth-tagline {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-top: 0.3rem;
  margin-bottom: 1.8rem;
  font-style: italic;
}

/* Tabs */
.auth-tabs {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.8rem;
}
.auth-tabs button {
  flex: 1;
  padding: 0.6rem 1rem;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  transition:
    background var(--transition),
    color var(--transition);
}
.auth-tabs button.active {
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 500;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.field input {
  padding: 0.7rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.95rem;
  transition: border-color var(--transition);
}
.field input:focus {
  border-color: var(--color-amber);
}
.field input::placeholder {
  color: var(--color-text-muted);
}

.auth-error {
  color: var(--color-error);
  font-size: 0.85rem;
  padding: 0.6rem 0.8rem;
  background: rgba(224, 80, 80, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(224, 80, 80, 0.25);
}

.auth-submit {
  margin-top: 0.5rem;
  padding: 0.8rem;
  background: var(--color-amber);
  color: #0d0600;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 8px;
  transition:
    background var(--transition),
    transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
}
.auth-submit:hover:not(:disabled) {
  background: var(--color-amber-lt);
  transform: translateY(-1px);
}
.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(13, 6, 0, 0.3);
  border-top-color: #0d0600;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transitions Vue */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin: 0;
}
.slide-enter-to,
.slide-leave-from {
  max-height: 100px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
