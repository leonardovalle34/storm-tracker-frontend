<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FavoriteStar from '@/components/FavoriteStar/FavoriteStar.vue'
import { useDebounceFn } from '@/composables/useDebounceFn'
import { useFavoritesStore } from '@/stores/favorites'
import { useHistoryStore } from '@/stores/history'
import { useLocationStore } from '@/stores/location'
import { samePlace } from '@/utils/savedPlaces'
import type { Location } from '@/types/weather'

const { t } = useI18n()
const locationStore = useLocationStore()
const { location, results, searching: loading, searched } = storeToRefs(locationStore)
const { select, search, clearSearch } = locationStore

const query = ref('')
const open = ref(false)
const active = ref(-1)

// Public Nominatim allows 1 req/s: debounce + minimum length keep us well under it.
const DEBOUNCE_MS = 500
const MIN_CHARS = 3
const debouncedSearch = useDebounceFn((q: string) => void search(q), DEBOUNCE_MS)

const favoritesStore = useFavoritesStore()
const { list: favorites } = storeToRefs(favoritesStore)
const { list: history } = storeToRefs(useHistoryStore())

// Untouched field: favorites, then recent searches (minus the ones already starred). Typing swaps in live results.
const suggesting = computed(() => query.value === '')
const sections = computed(() => {
  const groups = suggesting.value
    ? [
        { id: 'favorites', label: t('header.favorites'), icon: 'star', places: favorites.value },
        {
          id: 'recent',
          label: t('header.recent'),
          icon: 'clock',
          places: history.value.filter((h) => !favorites.value.some((f) => samePlace(f, h))),
        },
      ]
    : [{ id: 'results', label: '', icon: '', places: results.value }]
  let index = 0
  return groups
    .filter((g) => g.places.length > 0)
    .map((g) => ({ ...g, items: g.places.map((place) => ({ place, index: index++ })) }))
})
const options = computed(() => sections.value.flatMap((g) => g.items.map((i) => i.place)))
const showList = computed(
  () =>
    open.value &&
    (suggesting.value
      ? options.value.length > 0
      : options.value.length > 0 || loading.value || searched.value),
)

function onInput(e: Event) {
  query.value = (e.target as HTMLInputElement).value
  open.value = true
  active.value = -1
  // Only typing searches: names set programmatically (a pick, a reset) never trigger one.
  const q = query.value.trim()
  if (q.length < MIN_CHARS) {
    debouncedSearch.cancel()
    clearSearch()
  } else debouncedSearch(q)
}

// A place chosen elsewhere (map click / geolocation, whose name is just coordinates) makes whatever
// is written here stale, so clear it. A pick from this box sets query to the same name and is kept.
watch(location, (loc) => {
  if (!loc || loc.name === query.value || query.value === '') return
  query.value = ''
  debouncedSearch.cancel()
  clearSearch()
  open.value = false
  active.value = -1
})

function pick(l: Location) {
  query.value = l.name
  select(l)
  debouncedSearch.cancel()
  clearSearch()
  open.value = false
}

function onKey(e: KeyboardEvent) {
  const n = options.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    open.value = true
    active.value = (active.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    active.value = (active.value - 1 + n) % n
  } else if (e.key === 'Enter' && active.value >= 0) {
    e.preventDefault()
    pick(options.value[active.value])
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
      <template v-if="!suggesting">
        <li v-if="loading" class="px-3 py-2 text-muted">{{ t('header.searching') }}</li>
        <li v-else-if="options.length === 0" class="px-3 py-2 text-muted">{{ t('header.noResults') }}</li>
      </template>
      <template v-for="g in sections" :key="g.id">
        <li
          v-if="g.label"
          role="presentation"
          :data-testid="`section-${g.id}`"
          class="flex items-center gap-2 px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted"
        >
          <svg
            v-if="g.icon === 'star'"
            data-testid="icon-star"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor"
            class="text-accent"
            aria-hidden="true"
          >
            <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z" />
          </svg>
          <svg
            v-else
            data-testid="icon-clock"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {{ g.label }}
        </li>
        <li
          v-for="{ place, index } in g.items"
          :key="`${g.id},${place.latitude},${place.longitude},${index}`"
          role="option"
          :aria-selected="index === active"
          class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface-2"
          :class="{ 'bg-surface-2': index === active }"
          @mousedown.prevent
          @click="pick(place)"
        >
          <span class="min-w-0 flex-1 truncate">{{ place.name }}</span>
          <FavoriteStar
            :active="favoritesStore.isFavorite(place)"
            :label="favoritesStore.isFavorite(place) ? t('header.removeFavorite') : t('header.addFavorite')"
            @toggle="favoritesStore.toggle(place)"
          />
        </li>
      </template>
    </ul>
  </div>
</template>
