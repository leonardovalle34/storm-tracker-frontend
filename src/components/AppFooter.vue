<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import fullLogo from '@/assets/full-logo-light.png'

const { t } = useI18n()
</script>

<template>
  <!-- Same fixed navy as the header: brand color, identical in light and dark themes -->
  <footer class="bg-brand text-brand-fg">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <!-- full logo with the lettering recolored to light: legible straight on the navy, no backing box -->
      <img :src="fullLogo" :alt="t('app.title')" class="h-24 w-auto" />
      <p class="text-sm text-brand-fg/85">
        {{ t('footer.madeBy') }}
        <a
          href="https://nexustecnologia.online"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-brand-fg underline underline-offset-2 hover:text-white"
          >{{ t('footer.company') }}</a
        >
      </p>
    </div>
  </footer>
</template>
