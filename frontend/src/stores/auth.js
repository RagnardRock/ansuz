import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi, userApi } from '@/api/index.js'
import router from '@/router/index.js'

export const useAuthStore = defineStore('auth', () => {
  // Le token est dans le cookie HttpOnly — JS ne peut pas le lire.
  // On stocke uniquement les infos d'affichage (username, id) dans localStorage.
  const user = ref(JSON.parse(localStorage.getItem('user') ?? 'null'))

  const isLoggedIn = computed(() => !!user.value)

  function _persistUser(u) {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  function _clearUser() {
    user.value = null
    localStorage.removeItem('user')
  }

  async function register(username, email, password) {
    const { data } = await authApi.register({ username, email, password })
    _persistUser(data.user)
    router.push({ name: 'library' })
  }

  async function login(email, password) {
    const { data } = await authApi.login({ email, password })
    _persistUser(data.user)
    router.push({ name: 'home' })
  }

  async function logout() {
    await authApi.logout().catch(() => {})
    _clearUser()
    router.push({ name: 'home' })
  }

  async function deleteAccount() {
    await userApi.deleteMe()
    _clearUser()
    router.push({ name: 'auth' })
  }

  async function updateAvatar(avatar_url) {
    const { data } = await userApi.updateMe({ avatar_url: avatar_url || null })
    _persistUser({ ...user.value, avatar_url: data.avatar_url ?? null })
  }

  async function updateProfile(payload) {
    const { data } = await userApi.updateMe(payload)
    _persistUser({ ...user.value, ...data })
    return data
  }

  return { user, isLoggedIn, register, login, logout, deleteAccount, updateAvatar, updateProfile }
})
