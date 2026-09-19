<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import ForecastCards from '@/components/ForecastCards.vue'
import LocationMap from '@/components/LocationMap.vue'
import ModelMaps from '@/components/ModelMaps.vue'
import OceanGrid from '@/components/OceanGrid.vue'
import WindGrid from '@/components/WindGrid.vue'
import { requestInitialLocation } from '@/composables/useGeolocation'
import { useSelectedLocation } from '@/composables/useSelectedLocation'
import { useWeather } from '@/composables/useWeather'

const { t } = useI18n()
const { location } = useSelectedLocation()
const { forecast, marine, loading, error, isCoastal } = useWeather()

onMounted(() => void requestInitialLocation())

// Windy needs a centre even before the user picks something (Santos, SP).
const DEFAULT_CENTER = { latitude: -23.96, longitude: -46.33 }
const mapsCenter = computed(() => location.value ?? DEFAULT_CENTER)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-page text-ink">
    <AppHeader />
    <main class="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6">
      <section data-section="map">
        <h2 class="mb-3 text-xl font-semibold">{{ t('map.title') }}</h2>
        <LocationMap />
        <p v-if="location" class="mt-2 text-sm font-medium">📍 {{ location.name }}</p>
      </section>

      <p v-if="!location" class="text-muted">{{ t('common.noLocation') }}</p>
      <p v-else-if="loading" class="text-muted" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="error" role="alert" class="rounded-md border border-line bg-surface p-3">
        {{ t('common.error') }}
      </p>

      <template v-if="location && !loading && forecast">
        <section data-section="forecast"><ForecastCards :daily="forecast.daily" /></section>
        <section data-section="wind"><WindGrid :hourly="forecast.hourly" /></section>
        <section v-if="isCoastal && marine" data-section="ocean">
          <OceanGrid :hourly="marine.hourly" />
        </section>
      </template>

      <section data-section="models">
        <ModelMaps :location="mapsCenter" :coastal="!!location && isCoastal" />
      </section>
    </main>
    <AppFooter />
  </div>
</template>
