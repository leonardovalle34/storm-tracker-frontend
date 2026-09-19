import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import { _resetTheme } from './composables/useTheme'
import './style.css'

_resetTheme() // apply the stored theme before first paint
createApp(App).use(i18n).mount('#app')
