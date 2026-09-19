<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import fullLogo from '@/assets/full-logo.png'

const { t } = useI18n()
</script>

<template>
  <footer class="border-t border-line bg-surface text-ink">
    <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <img :src="fullLogo" :alt="t('app.title')" class="h-10 w-auto" />
      <p class="text-sm text-muted">
        {{ t('footer.madeBy') }}
        <a
          href="https://nexustecnologia.online"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-accent underline underline-offset-2"
          >{{ t('footer.company') }}</a
        >
      </p>
    </div>
  </footer>
</template>
