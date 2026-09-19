<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale, type LocaleCode } from '@/i18n'

const { t, locale } = useI18n()
</script>

<template>
  <select
    :value="locale"
    :aria-label="t('header.language')"
    class="h-9 rounded-md border border-white/30 bg-brand px-2 text-sm text-brand-fg focus-visible:outline-2 focus-visible:outline-white"
    @change="setLocale(($event.target as HTMLSelectElement).value as LocaleCode)"
  >
    <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.label }}</option>
  </select>
</template>
