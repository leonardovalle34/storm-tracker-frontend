<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocationStore } from '@/stores/location'
import CurrentWeather from '@/components/CurrentWeather/CurrentWeather.vue'
import FavoriteStar from '@/components/FavoriteStar/FavoriteStar.vue'
import LocationMap from '@/components/LocationMap/LocationMap.vue'
import { useFavoritesStore } from '@/stores/favorites'

const { t } = useI18n()
const { location } = storeToRefs(useLocationStore())
const favoritesStore = useFavoritesStore()

// Expanded until a place is chosen; every new selection (search, map click, geolocation) collapses it.
const expanded = ref(true)
const mapRef = ref<InstanceType<typeof LocationMap> | null>(null)

watch(location, (loc) => {
  if (loc) expanded.value = false
})

const label = computed(() => {
  const l = location.value
  if (!l) return ''
  return l.name || `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)}`
})

function minimize() {
  expanded.value = false
}

function change() {
  expanded.value = true
  mapRef.value?.refresh?.()
}

// Leaflet must re-measure once the container has its final size, i.e. after the height animation.
function onTransitionEnd(e: TransitionEvent) {
  if (e.propertyName === 'grid-template-rows' && expanded.value) mapRef.value?.refresh?.()
}

// Animating grid-template-rows between 0fr and 1fr gives a smooth height change to/from auto height.
const WRAP = 'grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none'
</script>

<template>
  <div data-testid="location-picker" :data-state="expanded ? 'expanded' : 'collapsed'">
    <div
      data-testid="location-strip"
      :class="[WRAP, expanded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]']"
      :inert="expanded || undefined"
    >
      <div class="min-h-0 overflow-hidden">
        <div data-testid="strip-card" class="overflow-hidden rounded-lg border border-line bg-surface">
          <div data-testid="strip-bar" class="flex h-10 items-center gap-2 px-3 text-sm">
            <svg
              data-testid="pin-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              class="shrink-0 text-accent"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
              />
            </svg>
            <span
              v-if="location"
              class="min-w-0 truncate font-medium"
              :title="label"
              :aria-label="t('map.current')"
              >{{ label }}</span
            >
            <FavoriteStar
              v-if="location"
              :active="favoritesStore.isFavorite(location)"
              :label="
                favoritesStore.isFavorite(location) ? t('header.removeFavorite') : t('header.addFavorite')
              "
              @toggle="favoritesStore.toggle(location)"
            />
            <span v-else class="min-w-0 truncate text-muted">{{ t('map.none') }}</span>
            <button
              type="button"
              class="ml-auto shrink-0 rounded px-2 py-1 font-medium text-accent underline underline-offset-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              data-testid="change-location"
              :aria-expanded="!expanded"
              @click="change"
            >
              {{ location ? t('map.change') : t('map.choose') }}
            </button>
          </div>
          <CurrentWeather class="border-t border-line px-3 py-1.5" />
        </div>
      </div>
    </div>

    <div
      data-testid="map-region-wrap"
      :class="[WRAP, expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]']"
      @transitionend="onTransitionEnd"
    >
      <div
        data-testid="map-region"
        class="min-h-0 overflow-hidden"
        :inert="!expanded || undefined"
        :aria-hidden="!expanded ? 'true' : undefined"
      >
        <h2 class="mb-3 text-xl font-semibold">{{ t('map.title') }}</h2>
        <!-- one box, like the collapsed strip: the map on top and the current conditions at its bottom -->
        <div class="overflow-hidden rounded-lg border border-line bg-surface">
          <div class="relative">
            <LocationMap ref="mapRef" />
            <button
              type="button"
              data-testid="minimize-map"
              :aria-label="t('map.minimize')"
              :title="t('map.minimize')"
              class="absolute right-2 top-2 z-[1000] flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface/80 text-ink opacity-80 shadow-sm backdrop-blur hover:bg-surface hover:opacity-100 focus-visible:outline-2 focus-visible:outline-accent"
              @click="minimize"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 15 6-6 6 6" />
                <path d="m6 20 6-6 6 6" />
              </svg>
            </button>
          </div>
          <CurrentWeather class="border-t border-line px-3 py-1.5" />
        </div>
        <p class="mt-1 text-sm text-muted">{{ t('map.hint') }}</p>
      </div>
    </div>
  </div>
</template>
