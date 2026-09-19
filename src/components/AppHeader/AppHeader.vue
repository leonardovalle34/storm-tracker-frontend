<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import roundLogo from '@/assets/round-logo.png'
import LanguageSelect from '@/components/LanguageSelect/LanguageSelect.vue'
import LocationSearch from '@/components/LocationSearch/LocationSearch.vue'
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.vue'
import UnitToggle from '@/components/UnitToggle/UnitToggle.vue'

const { t } = useI18n()
</script>

<template>
  <!-- bg-brand is the logo navy (#0B2338): brand color, identical in both themes -->
  <header class="sticky top-0 z-[1100] bg-brand text-brand-fg shadow">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
      <img :src="roundLogo" :alt="t('app.title')" class="h-14 w-14 shrink-0 rounded-full" />
      <div class="order-last w-full sm:order-none sm:ml-auto sm:w-auto sm:min-w-72 sm:flex-1 sm:max-w-md">
        <LocationSearch />
      </div>
      <div class="ml-auto flex items-center gap-2 sm:ml-0">
        <LanguageSelect />
        <UnitToggle />
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
