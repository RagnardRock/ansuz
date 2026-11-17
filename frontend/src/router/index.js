import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const CategoryView = () => import('@/views/CategoryView.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/bibliotheque',
    name: 'library',
    component: CategoryView,
  },
  {
    path: '/livres',
    name: 'livres',
    component: CategoryView,
  },
  {
    path: '/mangas',
    name: 'mangas',
    component: CategoryView,
  },
  {
    path: '/films',
    name: 'films',
    component: CategoryView,
  },
  {
    path: '/series',
    name: 'series',
    component: CategoryView,
  },
  {
    path: '/musique',
    name: 'musique',
    component: CategoryView,
  },
  {
    path: '/jeux',
    name: 'jeux',
    component: CategoryView,
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/profil/:username',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAdmin: true },
  },
  {
    path: '/mentions-legales',
    name: 'mentions-legales',
    component: () => import('@/views/MentionsLegalesView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'auth' }
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'home' }
  if (to.meta.requiresAdmin && !auth.user?.is_admin) return { name: 'home' }
})

export default router
