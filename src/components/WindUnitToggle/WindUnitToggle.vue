<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useUnitsStore } from '@/stores/units'
import type { WindUnit } from '@/utils/wind'

const { t } = useI18n()
const unitsStore = useUnitsStore()
const { windUnit } = storeToRefs(unitsStore)
const options: { value: WindUnit; label: string }[] = [
  { value: 'kn', label: 'kt' },
  { value: 'km/h', label: 'km/h' },
]
</script>

<template>
  <!-- same two-segment switch as the temperature toggle -->
  <div
    role="group"
    :aria-label="t('header.windUnit')"
    :title="t('header.windUnitTip')"
    class="inline-flex h-9 items-center rounded-md border border-white/30 p-0.5 text-sm"
  >
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      :data-unit="o.value"
      :aria-pressed="windUnit === o.value"
      class="h-7 min-w-8 rounded px-1.5 font-medium sm:min-w-9 sm:px-2 focus-visible:outline-2 focus-visible:outline-white"
      :class="windUnit === o.value ? 'bg-white text-brand' : 'text-brand-fg hover:bg-white/10'"
      @click="unitsStore.setWindUnit(o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
