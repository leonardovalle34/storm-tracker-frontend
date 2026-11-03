<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { useTooltip } from '@/composables/useTooltip'
import type { Isolated } from '@/utils/dailyCondition'

const props = withDefaults(
  defineProps<{
    icon: string
    /** accessible name: the condition */
    label: string
    /** tooltip lines, linked with aria-describedby */
    tip: string[]
    /** small drop / bolt over the icon for isolated rain / thunder */
    isolated?: Isolated
    /** own tab stop; off inside a button (the card), which drives `active` from its focus instead */
    focusable?: boolean
    /** opens the tooltip from outside (keyboard focus on the parent card) */
    active?: boolean
    testid?: string
  }>(),
  { isolated: 'none', focusable: false, active: false, testid: 'weather-icon' },
)

const BADGE: Record<Exclude<Isolated, 'none'>, string> = { rain: '💧', thunder: '⚡' }
const tipId = `wx-tip-${useId()}`
const el = ref<HTMLElement>()
const { open, style, show, hide, toggle } = useTooltip()
watch(
  () => props.active,
  (on) => (on && el.value ? show(el.value) : hide()),
)

let touch = false
const onPointerDown = (e: PointerEvent) => (touch = e.pointerType === 'touch')
function onClick(e: MouseEvent) {
  if (!touch || !el.value) return
  // on a phone the tap shows the tooltip instead of opening the card
  e.preventDefault()
  e.stopPropagation()
  touch = false
  toggle(el.value)
}
</script>

<template>
  <!-- tooltip is a sibling of the icon (not inside it), so the icon's text is just the glyph -->
  <span class="inline-block leading-none">
    <span
      ref="el"
      :data-testid="testid"
      role="img"
      :aria-label="label"
      :aria-describedby="tipId"
      :data-isolated="isolated"
      :tabindex="focusable ? 0 : undefined"
      class="relative inline-block focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-accent"
      @mouseenter="show(el!)"
      @mouseleave="hide"
      @focus="show(el!)"
      @blur="hide"
      @pointerdown="onPointerDown"
      @click="onClick"
      >{{ icon
      }}<span
        v-if="isolated !== 'none'"
        data-testid="weather-badge"
        aria-hidden="true"
        class="absolute -bottom-1 -right-1.5 rounded-full bg-surface px-px text-[0.45em] leading-none ring-1 ring-line"
        >{{ BADGE[isolated] }}</span
      ></span
    >
    <span
      :id="tipId"
      role="tooltip"
      :data-testid="`${testid}-tip`"
      :data-open="open"
      :style="style"
      class="pointer-events-none fixed z-50 rounded-md border border-line bg-surface p-2 text-left text-xs font-normal leading-snug text-ink shadow-lg transition-opacity motion-reduce:transition-none"
      :class="open ? 'visible opacity-100' : 'invisible opacity-0'"
    >
      <span v-for="(line, i) in tip" :key="i" class="block" :class="i > 0 ? 'mt-1 text-muted' : ''">{{
        line
      }}</span>
    </span>
  </span>
</template>
