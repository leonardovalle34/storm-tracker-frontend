<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useUnitsStore } from '@/stores/units'
import type { TempUnit } from '@/utils/temperature'

const { t } = useI18n()
const unitsStore = useUnitsStore()
const { temperature } = storeToRefs(unitsStore)
const options: TempUnit[] = ['C', 'F']
</script>

<template>
  <!-- two-segment switch, on the header navy like the other controls -->
  <div
    role="group"
    :aria-label="t('header.temperatureUnit')"
    :title="t('header.temperatureUnitTip')"
    class="inline-flex h-9 items-center rounded-md border border-white/30 p-0.5 text-sm"
  >
    <button
      v-for="u in options"
      :key="u"
      type="button"
      :data-unit="u"
      :aria-pressed="temperature === u"
      class="h-7 min-w-8 rounded px-1.5 font-medium sm:min-w-9 sm:px-2 focus-visible:outline-2 focus-visible:outline-white"
      :class="temperature === u ? 'bg-white text-brand' : 'text-brand-fg hover:bg-white/10'"
      @click="unitsStore.setTemperature(u)"
    >
      °{{ u }}
    </button>
  </div>
</template>
