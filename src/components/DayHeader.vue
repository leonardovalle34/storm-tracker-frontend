<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { DAY_START, HOURS_PER_DAY } from '@/utils/gridStyles'
import { HOURS } from '@/utils/hourly'

// <thead> shared by the wind and ocean tables: one header cell per day grouping its 7 hour columns.
// The optional "between" slot renders an extra row (the tide charts) between day names and hours.
defineProps<{ dates: string[] }>()
const { t } = useI18n()
const sticky =
  'sticky left-0 z-10 border-r border-line bg-surface px-2 text-left text-xs font-normal text-muted'
</script>

<template>
  <thead>
    <tr>
      <th :class="sticky" scope="col"></th>
      <th
        v-for="(date, i) in dates"
        :key="date"
        scope="colgroup"
        :colspan="HOURS_PER_DAY"
        data-testid="day-head"
        class="px-2 py-1 text-left font-medium"
        :class="DAY_START"
      >
        <slot name="day" :date="date" :index="i" />
      </th>
    </tr>
    <slot name="between" />
    <tr>
      <th :class="sticky" scope="col">{{ t('wind.hour') }}</th>
      <template v-for="date in dates" :key="date">
        <th
          v-for="(h, i) in HOURS"
          :key="h"
          scope="col"
          data-testid="hour-head"
          class="h-6 border border-surface px-0 text-center text-xs font-medium"
          :class="i === 0 && DAY_START"
        >
          {{ h }}h
        </th>
      </template>
    </tr>
  </thead>
</template>
