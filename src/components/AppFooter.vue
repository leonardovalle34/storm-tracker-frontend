<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import fullLogo from '@/assets/full-logo.png'

const { t } = useI18n()
</script>

<template>
  <!-- Same fixed navy as the header: brand color, identical in light and dark themes -->
  <footer class="bg-brand text-brand-fg">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <!-- the logo has transparent background and dark lettering, so it sits on a light badge -->
      <span class="inline-flex rounded-md bg-white p-1">
        <img :src="fullLogo" :alt="t('app.title')" class="h-10 w-auto" />
      </span>
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
