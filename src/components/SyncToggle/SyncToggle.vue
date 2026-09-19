<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useScrollSyncStore } from '@/stores/scrollSync'

const { t } = useI18n()
const scrollSyncStore = useScrollSyncStore()
const { enabled } = storeToRefs(scrollSyncStore)
const { toggle } = scrollSyncStore
const tipId = `sync-tip-${useId()}`
</script>

<template>
  <!-- One shared setting: every instance (forecast, wind, ocean headers) shows and flips the same state. -->
  <div class="group relative inline-flex items-center">
    <button
      type="button"
      role="switch"
      :aria-checked="enabled"
      :aria-describedby="tipId"
      class="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      @click="toggle"
    >
      <span
        class="relative inline-block h-4 w-7 shrink-0 rounded-full border border-line transition-colors motion-reduce:transition-none"
        :class="enabled ? 'bg-accent' : 'bg-surface-2'"
        aria-hidden="true"
      >
        <span
          class="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-surface shadow transition-all motion-reduce:transition-none"
          :class="enabled ? 'left-[calc(100%-0.875rem)]' : 'left-0.5 bg-muted'"
        />
      </span>
      {{ t('scrollSync.label') }}
    </button>
    <span
      :id="tipId"
      role="tooltip"
      class="invisible absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-line bg-surface p-2 text-xs font-normal leading-snug text-ink opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
    >
      {{ t('scrollSync.tooltip') }}
    </span>
  </div>
</template>
