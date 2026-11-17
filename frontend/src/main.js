/**
 * Point d'entrée de l'application Vue.
 *
 * createApp()  → crée l'instance Vue
 * use(pinia)   → active le store global (Pinia)
 * use(router)  → active le routing (Vue Router)
 * mount('#app')→ attache l'app au div dans index.html
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
