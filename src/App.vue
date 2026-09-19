<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppFooter from '@/components/AppFooter/AppFooter.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import ForecastCards from '@/components/ForecastCards/ForecastCards.vue'
import LocationPicker from '@/components/LocationPicker/LocationPicker.vue'
import ModelMaps from '@/components/ModelMaps/ModelMaps.vue'
import OceanGrid from '@/components/OceanGrid/OceanGrid.vue'
import WindGrid from '@/components/WindGrid/WindGrid.vue'
import { useLocationStore } from '@/stores/location'
import { useWeatherStore } from '@/stores/weather'

const { t } = useI18n()
const locationStore = useLocationStore()
const weatherStore = useWeatherStore()
const { location } = storeToRefs(locationStore)
const { forecast, marine, loading, error, isCoastal } = storeToRefs(weatherStore)

watch(location, () => void weatherStore.load(), { immediate: true })
onMounted(() => void locationStore.detectLocation())

// Windy needs a centre even before the user picks something (Santos, SP).
const DEFAULT_CENTER = { latitude: -23.96, longitude: -46.33 }
const mapsCenter = computed(() => location.value ?? DEFAULT_CENTER)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-page text-ink">
    <AppHeader />
    <main class="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6">
      <section data-section="map"><LocationPicker /></section>

      <p v-if="!location" class="text-muted">{{ t('common.noLocation') }}</p>
      <p v-else-if="loading" class="text-muted" role="status">{{ t('common.loading') }}</p>
      <p v-else-if="error" role="alert" class="rounded-md border border-line bg-surface p-3">
        {{ t('common.error') }}
      </p>

      <template v-if="location && !loading && forecast">
        <section data-section="forecast">
          <ForecastCards
            :daily="forecast.daily"
            :hourly="forecast.hourly"
            :marine="isCoastal ? marine?.hourly : null"
          />
        </section>
        <section data-section="wind"><WindGrid :hourly="forecast.hourly" /></section>
        <section v-if="isCoastal && marine" data-section="ocean">
          <OceanGrid :hourly="marine.hourly" :forecast="forecast" />
        </section>
      </template>

      <section data-section="models">
        <ModelMaps :location="mapsCenter" :coastal="!!location && isCoastal" />
      </section>
    </main>
    <AppFooter />
  </div>
</template>
