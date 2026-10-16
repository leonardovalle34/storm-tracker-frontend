<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatClockTime } from '@/utils/clock'

const props = defineProps<{ sunrise?: string | null; sunset?: string | null }>()
const { t } = useI18n()

// a missing time drops just that half; both missing renders nothing
const rise = computed(() => formatClockTime(props.sunrise))
const set = computed(() => formatClockTime(props.sunset))
</script>

<template>
  <span
    v-if="rise || set"
    data-testid="sun-times"
    class="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-muted"
  >
    <span
      v-if="rise"
      data-testid="sunrise"
      class="inline-flex items-center gap-0.5"
      :title="t('sun.sunrise')"
    >
      <svg
        role="img"
        :aria-label="t('sun.sunrise')"
        viewBox="0 0 24 24"
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M17 18a5 5 0 0 0-10 0M12 2v7M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M8 6l4-4 4 4"
        />
      </svg>
      <span>{{ rise }}</span>
    </span>
    <span v-if="set" data-testid="sunset" class="inline-flex items-center gap-0.5" :title="t('sun.sunset')">
      <svg
        role="img"
        :aria-label="t('sun.sunset')"
        viewBox="0 0 24 24"
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M17 18a5 5 0 0 0-10 0M12 9V2M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M16 5l-4 4-4-4"
        />
      </svg>
      <span>{{ set }}</span>
    </span>
  </span>
</template>
