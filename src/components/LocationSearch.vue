<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocationSearch } from '@/composables/useLocationSearch'
import { useSelectedLocation } from '@/composables/useSelectedLocation'
import type { Location } from '@/types/weather'

const { t } = useI18n()
const { location, select } = useSelectedLocation()

const query = ref('')
const open = ref(false)
const active = ref(-1)
const { results, loading, searched, skipNext, clear } = useLocationSearch(query)

const showList = computed(() => open.value && (results.value.length > 0 || loading.value || searched.value))

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  open.value = true
  active.value = -1
}

// A place chosen elsewhere (map click / geolocation, whose name is just coordinates) makes whatever
// is written here stale, so clear it. A pick from this box sets query to the same name and is kept.
watch(location, (loc) => {
  if (!loc || loc.name === query.value || query.value === '') return
  skipNext() // only when the value really changes, otherwise the flag would swallow the next keystroke
  query.value = ''
  clear()
  open.value = false
  active.value = -1
})

function pick(l: Location) {
  skipNext()
  query.value = l.name
  select(l)
  clear()
  open.value = false
}

function onKey(e: KeyboardEvent) {
  const n = results.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    open.value = true
    active.value = (active.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault()
    pick(results.value[active.value])
  } else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="relative w-full">
    <input
      :value="query"
      type="search"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      aria-controls="location-listbox"
      :aria-expanded="showList"
      :aria-label="t('header.searchLabel')"
      :placeholder="t('header.searchPlaceholder')"
      class="h-9 w-full rounded-md border border-white/30 bg-white/10 px-3 text-sm text-brand-fg placeholder:text-slate-300 focus-visible:outline-2 focus-visible:outline-white"
      @input="onInput"
      @keydown="onKey"
      @blur="open = false"
      @focus="open = true"
    />
    <ul
      v-show="showList"
      id="location-listbox"
      role="listbox"
      class="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-72 overflow-auto rounded-md border border-line bg-surface text-sm text-ink shadow-lg"
    >
      <li v-if="loading" class="px-3 py-2 text-muted">{{ t('header.searching') }}</li>
      <li v-else-if="results.length === 0" class="px-3 py-2 text-muted">{{ t('header.noResults') }}</li>
      <li
        v-for="(r, i) in results"
        :key="`${r.latitude},${r.longitude},${i}`"
        role="option"
        :aria-selected="i === active"
        class="cursor-pointer px-3 py-2 hover:bg-surface-2"
        :class="{ 'bg-surface-2': i === active }"
        @mousedown.prevent
        @click="pick(r)"
      >
        {{ r.name }}
      </li>
    </ul>
  </div>
</template>
