<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocationStore } from '@/stores/location'

const { t } = useI18n()
const locationStore = useLocationStore()
const { location } = storeToRefs(locationStore)
const { selectCoords } = locationStore

const el = ref<HTMLDivElement>()
let map: L.Map | undefined
let marker: L.Marker | undefined
let fromMapClick = false

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
// Transparent overlay with boundaries and place names, drawn above the imagery (hybrid look)
const ESRI_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

function placeMarker(lat: number, lon: number) {
  if (!map) return
  if (marker) marker.setLatLng([lat, lon])
  else
    marker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#ef4444;border:3px solid #fff;box-shadow:0 0 4px #000"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(map)
}

onMounted(() => {
  map = L.map(el.value!).setView([-15, -50], 4)
  L.tileLayer(ESRI, {
    maxZoom: 17,
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  }).addTo(map)
  L.tileLayer(ESRI_LABELS, { attribution: 'Esri' }).addTo(map) // added after the imagery, so it renders on top
  map.on('click', (e: L.LeafletMouseEvent) => {
    fromMapClick = true
    selectCoords(e.latlng.lat, e.latlng.lng)
  })
  map.invalidateSize()
  if (location.value) placeMarker(location.value.latitude, location.value.longitude)
})

watch(location, (loc) => {
  if (!loc || !map) return
  placeMarker(loc.latitude, loc.longitude)
  // Clicks keep the user's zoom; a search pick recenters on the place.
  if (!fromMapClick) map.setView([loc.latitude, loc.longitude], 9)
  fromMapClick = false
})

/** Re-measure after the container changed size (collapse/expand) and recenter on the current location. */
function refresh() {
  map?.invalidateSize()
  if (location.value) map?.panTo([location.value.latitude, location.value.longitude])
}
defineExpose({ refresh })

onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div ref="el" role="application" :aria-label="t('map.label')" class="z-0 h-72 w-full sm:h-96" />
</template>
