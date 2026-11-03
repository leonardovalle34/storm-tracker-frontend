<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTooltip } from '@/composables/useTooltip'
import { useUnitsStore } from '@/stores/units'
import { hourTip } from '@/utils/conditionText'
import type { DayHour } from '@/utils/dayHours'
import { smoothPath } from '@/utils/tide'
import { formatTemp } from '@/utils/temperature'

// One entry per hour of the day (0..23); temp in °C, null where missing.
const props = defineProps<{ hours: DayHour[] }>()
const { t, locale } = useI18n()
const { temperature: unit } = storeToRefs(useUnitsStore())

const uid = useId()
const gradId = `temp-grad-${uid}` // unique per instance
const tipIdOf = (hour: number) => `temp-tip-${uid}-${hour}`

// hour icon tooltips: one visible bubble for the active hour (hover, keyboard focus or tap); each icon
// is also described by its own hidden text, so screen readers do not depend on the bubble
const tips = computed(() => props.hours.map((h) => hourTip(h.code, h.precipitation, t, locale.value)))
const activeHour = ref<number | null>(null)
const tooltip = useTooltip()
function showTip(e: Event, hour: number) {
  activeHour.value = hour
  tooltip.show(e.currentTarget as Element)
}
let touch = false
const onPointerDown = (e: PointerEvent) => (touch = e.pointerType === 'touch')
function onTap(e: MouseEvent, hour: number) {
  if (!touch) return
  touch = false
  activeHour.value = hour
  tooltip.toggle(e.currentTarget as Element)
}

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
  <div v-if="enough">
    <svg
      data-testid="temp-chart-svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="block h-auto w-full min-w-[44rem] text-warm"
      role="group"
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
        tabindex="0"
        :aria-label="t(`weather.${h.weather.key}`)"
        :aria-describedby="tipIdOf(h.hour)"
        :x="xOf(h.hour)"
        :y="ICON_Y"
        text-anchor="middle"
        :font-size="FONT + 4"
        class="cursor-default outline-none focus-visible:fill-accent"
        @mouseenter="showTip($event, h.hour)"
        @mouseleave="tooltip.hide"
        @focus="showTip($event, h.hour)"
        @blur="tooltip.hide"
        @pointerdown="onPointerDown"
        @click="onTap($event, h.hour)"
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
    <span v-for="(tip, hour) in tips" :id="tipIdOf(hour)" :key="hour" class="sr-only">{{ tip }}</span>
    <div
      data-testid="hour-tip"
      aria-hidden="true"
      :data-open="tooltip.open.value"
      :style="tooltip.style.value"
      class="pointer-events-none fixed z-50 rounded-md border border-line bg-surface p-2 text-xs leading-snug text-ink shadow-lg transition-opacity motion-reduce:transition-none"
      :class="tooltip.open.value ? 'visible opacity-100' : 'invisible opacity-0'"
    >
      {{ activeHour === null ? '' : tips[activeHour] }}
    </div>
  </div>
</template>
