<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { HOURS } from '@/utils/hourly'
import { findExtrema, smoothPath } from '@/utils/tide'

// series[h] = sea level at hour h (0..23) of one day; null where missing.
const props = defineProps<{ series: (number | null)[] }>()
const { t } = useI18n()

const gradId = `tide-grad-${useId()}` // unique per instance (16 charts on the page)

// The viewBox is 7 grid columns wide, 100 units each, so the 3h..21h axis labels sit at the
// column centers and line up with the hourly grid below (which shares the same 7 columns).
const COL = 100
const W = COL * HOURS.length
const H = 150
const TOP = 34
const BASE = 104
const xOf = (hour: number) => (hour / 3 - 0.5) * COL

const valid = computed(() => props.series.filter((v) => v !== null))
const enough = computed(() => valid.value.length >= 2)

const yOf = computed(() => {
  const vals = valid.value as number[]
  const min = Math.min(...vals)
  const span = Math.max(...vals) - min || 1
  return (v: number) => BASE - ((v - min) / span) * (BASE - TOP)
})

const points = computed(() =>
  props.series.flatMap((v, h) => (v === null ? [] : [{ x: xOf(h), y: yOf.value(v) }])),
)
const line = computed(() => smoothPath(points.value))
const area = computed(() => {
  const p = points.value
  return p.length < 2 ? '' : `${line.value} L${p[p.length - 1].x} ${BASE + 6} L${p[0].x} ${BASE + 6} Z`
})

const marks = computed(() =>
  findExtrema(props.series)
    .map((e) => ({ ...e, x: xOf(e.index), y: yOf.value(e.value) }))
    .filter((e) => e.x >= 0 && e.x <= W) // hours outside the 3h..21h column band are clipped
    .map((e) => ({
      ...e,
      label: `${e.value.toFixed(2)} m`,
      anchor: e.x < 40 ? 'start' : e.x > W - 40 ? 'end' : 'middle',
    })),
)
</script>

<template>
  <svg
    v-if="enough"
    data-testid="tide-chart-svg"
    :viewBox="`0 0 ${W} ${H}`"
    class="block h-auto w-full text-ocean"
    role="img"
    :aria-label="t('ocean.tideChart')"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="currentColor" stop-opacity="0.45" />
        <stop offset="100%" stop-color="currentColor" stop-opacity="0.03" />
      </linearGradient>
    </defs>
    <path data-testid="tide-area" :d="area" :fill="`url(#${gradId})`" stroke="none" />
    <path
      data-testid="tide-line"
      :d="line"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <g v-for="m in marks" :key="m.index" data-testid="tide-extreme" :data-type="m.type">
      <circle :cx="m.x" :cy="m.y" r="5" fill="currentColor" class="stroke-surface" stroke-width="2" />
      <text :x="m.x" :y="m.y - 12" :text-anchor="m.anchor" font-size="20" font-weight="600" class="fill-ink">
        {{ m.label }}
      </text>
    </g>
    <line x1="0" :y1="BASE + 6" :x2="W" :y2="BASE + 6" class="stroke-line" stroke-width="1" />
    <text
      v-for="(h, i) in HOURS"
      :key="h"
      data-testid="tide-hour"
      :x="(i + 0.5) * COL"
      :y="H - 12"
      text-anchor="middle"
      font-size="20"
      class="fill-muted"
    >
      {{ h }}h
    </text>
  </svg>
</template>
