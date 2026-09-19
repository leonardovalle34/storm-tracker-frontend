<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { clarityLabel, type ClarityLabel } from '@/utils/waterClarity'
import { TONE_CLASS, type Tone } from '@/utils/tones'
import { uvLevel, type UvLevel } from '@/utils/uv'

const props = defineProps<{ kind: 'uv' | 'clarity'; value: number }>()
const { t } = useI18n()

const UV_TONE: Record<UvLevel, Tone> = {
  low: 'good',
  moderate: 'ok',
  high: 'warn',
  veryHigh: 'bad',
  extreme: 'bad',
}
const CLARITY_TONE: Record<ClarityLabel, Tone> = {
  excellent: 'good',
  good: 'ok',
  moderate: 'warn',
  poor: 'bad',
}

const badge = computed(() => {
  if (props.kind === 'uv') {
    const level = uvLevel(props.value)
    return {
      tone: UV_TONE[level],
      // Discreet: just the index (the colour carries the level); the level is in the tooltip.
      text: `UV ${Math.round(props.value)}`,
      title: `${t('uv.label')}: ${t(`uv.level.${level}`)}`,
    }
  }
  const level = clarityLabel(props.value)
  return { tone: CLARITY_TONE[level], text: t(`clarity.level.${level}`), title: t('clarity.estimate') }
})
</script>

<template>
  <span
    data-testid="badge"
    :title="badge.title"
    class="inline-block rounded leading-tight"
    :class="[
      TONE_CLASS[badge.tone],
      // fixed size so every UV chip is identical, whatever the number
      kind === 'uv'
        ? 'w-12 py-px text-center text-[11px] font-medium'
        : 'px-1.5 py-0.5 text-xs font-semibold',
    ]"
    >{{ badge.text }}</span
  >
</template>
