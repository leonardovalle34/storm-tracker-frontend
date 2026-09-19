<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUnitsStore } from '@/stores/units'
import type { Location } from '@/types/weather'
import { windyUrl, type WindyOverlay } from '@/utils/windy'

const props = defineProps<{ location: Pick<Location, 'latitude' | 'longitude'>; coastal: boolean }>()
const { t } = useI18n()
const { temperature: tempUnit } = storeToRefs(useUnitsStore())

const ALWAYS: WindyOverlay[] = ['rain', 'wind', 'temp']
const COASTAL: WindyOverlay[] = ['waves', 'sst']
const overlays = computed(() => (props.coastal ? [...ALWAYS, ...COASTAL] : ALWAYS))

const dialog = ref<HTMLDialogElement>()
const active = ref<WindyOverlay | null>(null)

function open(o: WindyOverlay) {
  active.value = o
  dialog.value?.showModal()
}
function close() {
  dialog.value?.close()
}
function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) close()
}
</script>

<template>
  <div>
    <h2 class="mb-3 text-xl font-semibold">{{ t('models.title') }}</h2>
    <div data-testid="model-grid" class="flex flex-wrap justify-center gap-4">
      <figure
        v-for="o in overlays"
        :key="o"
        class="w-full overflow-hidden rounded-lg border border-line bg-surface sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
      >
        <figcaption class="px-3 py-2 font-medium">{{ t(`models.${o}`) }}</figcaption>
        <div class="relative h-64">
          <iframe
            data-testid="model-frame"
            :src="windyUrl(location, o, false, tempUnit)"
            :title="t(`models.${o}`)"
            loading="lazy"
            tabindex="-1"
            class="pointer-events-none h-full w-full border-0"
          />
          <!-- iframes swallow clicks, so a transparent button covers each map to open the modal -->
          <button
            type="button"
            data-testid="model-open"
            :aria-label="`${t('models.expand')}: ${t(`models.${o}`)}`"
            class="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-accent"
            @click="open(o)"
          />
        </div>
      </figure>
    </div>

    <dialog
      ref="dialog"
      class="m-auto h-[85vh] w-[95vw] max-w-5xl overflow-hidden rounded-lg bg-surface p-0 text-ink backdrop:bg-black/70"
      :aria-label="active ? t(`models.${active}`) : t('models.title')"
      @click="onBackdrop"
      @close="active = null"
    >
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-line px-4 py-2">
          <h3 class="font-medium">{{ active ? t(`models.${active}`) : '' }}</h3>
          <button
            type="button"
            data-testid="modal-close"
            class="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface-2"
            @click="close"
          >
            {{ t('models.close') }}
          </button>
        </div>
        <iframe
          v-if="active"
          data-testid="modal-frame"
          :src="windyUrl(location, active, true, tempUnit)"
          :title="t(`models.${active}`)"
          class="min-h-0 w-full flex-1 border-0"
        />
      </div>
    </dialog>
  </div>
</template>
