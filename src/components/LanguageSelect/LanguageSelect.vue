<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { LocaleCode } from '@/i18n'
import { useLanguageStore } from '@/stores/language'

const { t } = useI18n()
const languageStore = useLanguageStore()
const { locale, locales } = storeToRefs(languageStore)
const { setLocale } = languageStore
</script>

<template>
  <select
    :value="locale"
    :aria-label="t('header.language')"
    class="h-9 rounded-md border border-white/30 bg-brand px-2 text-sm text-brand-fg focus-visible:outline-2 focus-visible:outline-white"
    @change="setLocale(($event.target as HTMLSelectElement).value as LocaleCode)"
  >
    <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.label }}</option>
  </select>
</template>
