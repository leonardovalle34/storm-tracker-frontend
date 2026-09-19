import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import { useThemeStore } from './stores/theme'
import './style.css'

const pinia = createPinia()
const app = createApp(App).use(pinia).use(i18n)
useThemeStore(pinia).init() // apply the stored theme before first paint
app.mount('#app')
