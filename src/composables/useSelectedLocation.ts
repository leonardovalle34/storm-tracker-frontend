import { ref } from 'vue'
import type { Location } from '@/types/weather'

const location = ref<Location | null>(null)

export function _resetSelectedLocation() {
  location.value = null
}

/** Single shared state fed by both the map click and the header autocomplete. */
export function useSelectedLocation() {
  const select = (l: Location) => {
    location.value = l
  }
  const selectCoords = (latitude: number, longitude: number) => {
    location.value = { name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude }
  }
  return { location, select, selectCoords }
}
