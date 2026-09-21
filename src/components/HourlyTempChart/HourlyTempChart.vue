<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUnitsStore } from '@/stores/units'
import type { DayHour } from '@/utils/dayHours'
import { smoothPath } from '@/utils/tide'
import { formatTemp } from '@/utils/temperature'

// One entry per hour of the day (0..23); temp in °C, null where missing.
const props = defineProps<{ hours: DayHour[] }>()
const { t } = useI18n()
const { temperature: unit } = storeToRefs(useUnitsStore())

const gradId = `temp-grad-${useId()}` // unique per instance

// viewBox: one 60-unit column per hour. Rows from top to bottom: weather icons, curve, values, hours.
const COL = 60
const W = COL * 24
const FONT = 24
const ICON_Y = 34
const TOP = 84
const BASE = 190
const VALUES_Y = BASE + 46
const HOURS_Y = BASE + 82
const H = BASE + 98
const xOf = (hour: number) => (hour + 0.5) * COL

const valid = computed(() => props.hours.filter((h) => h.temp !== null))
const enough = computed(() => valid.value.length >= 2)

const yOf = computed(() => {
  const vals = valid.value.map((h) => h.temp as number)
  const min = Math.min(...vals)
  const span = Math.max(...vals) - min || 1
  return (v: number) => BASE - ((v - min) / span) * (BASE - TOP)
})

const points = computed(() =>
  props.hours.flatMap((h) =>
    h.temp === null ? [] : [{ hour: h.hour, x: xOf(h.hour), y: yOf.value(h.temp) }],
  ),
)
const line = computed(() => smoothPath(points.value))
const area = computed(() => {
  const p = points.value
  return p.length < 2 ? '' : `${line.value} L${p[p.length - 1].x} ${BASE + 8} L${p[0].x} ${BASE + 8} Z`
})

const pad = (h: number) => `${String(h).padStart(2, '0')}h`
const valueText = (temp: number | null) => (temp === null ? '–' : formatTemp(temp, unit.value, 0, false))
</script>

<template>
  <svg
    v-if="enough"
    data-testid="temp-chart-svg"
    :viewBox="`0 0 ${W} ${H}`"
    class="block h-auto w-full min-w-[44rem] text-warm"
    role="img"
    :aria-label="t('forecast.tempChart')"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.45" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0.03" />
      </linearGradient>
    </defs>
    <path data-testid="temp-area" :d="area" :fill="`url(#${gradId})`" stroke="none" />
    <path
      data-testid="temp-line"
      :d="line"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      v-for="p in points"
      :key="p.hour"
      data-testid="temp-point"
      :cx="p.x"
      :cy="p.y"
      r="5"
      fill="currentColor"
      class="stroke-surface"
      stroke-width="2"
    />
    <text
      v-for="h in hours"
      :key="`i${h.hour}`"
      data-testid="temp-icon"
      role="img"
      :aria-label="t(`weather.${h.weather.key}`)"
      :x="xOf(h.hour)"
      :y="ICON_Y"
      text-anchor="middle"
      :font-size="FONT + 4"
    >
      {{ h.weather.icon }}
    </text>
    <line x1="0" :y1="BASE + 8" :x2="W" :y2="BASE + 8" class="stroke-line" stroke-width="1" />
    <text
      v-for="h in hours"
      :key="`v${h.hour}`"
      data-testid="temp-value"
      :x="xOf(h.hour)"
      :y="VALUES_Y"
      text-anchor="middle"
      :font-size="FONT"
      font-weight="600"
      class="fill-ink"
    >
      {{ valueText(h.temp) }}
    </text>
    <text
      v-for="h in hours"
      :key="`h${h.hour}`"
      data-testid="temp-hour"
      :x="xOf(h.hour)"
      :y="HOURS_Y"
      text-anchor="middle"
      :font-size="FONT - 2"
      class="fill-muted"
    >
      {{ pad(h.hour) }}
    </text>
  </svg>
</template>
