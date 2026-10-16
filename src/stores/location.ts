import { defineStore } from 'pinia'
import * as geocodeService from '@/services/geocodeService'
import type { Location } from '@/types/weather'
import { errorMessage } from '@/utils/errors'
import * as ipLocationService from '@/services/ipLocationService'
import {
  alreadyAsked,
  answered,
  geolocationSupported,
  getPosition,
  markAsked,
  permissionGranted,
} from '@/utils/geolocation'
import { useFavoritesStore } from './favorites'
import { useHistoryStore } from './history'

export const useLocationStore = defineStore('location', {
  state: () => ({
    /** Single shared selection, fed by the map click, the header autocomplete and the geolocation. */
    location: null as Location | null,
    /** Position the browser gave us on its own (null when denied, unavailable or not asked). */
    detected: null as Location | null,
    results: [] as Location[],
    searching: false,
    searched: false,
    searchError: null as string | null,
    searchToken: 0,
  }),

  actions: {
    select(l: Location) {
      this.location = l
      useHistoryStore().add(l) // search pick, map click and geolocation all end up here
    },

    selectCoords(latitude: number, longitude: number) {
      this.select({ name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, latitude, longitude })
    },

    /** Swallows failures (a failed autocomplete just shows nothing); the message is kept in `searchError`. */
    async search(query: string) {
      const current = ++this.searchToken
      this.searching = true
      this.searchError = null
      try {
        const found = await geocodeService.search(query)
        if (current !== this.searchToken) return
        this.results = found
        this.searched = true
      } catch (err) {
        if (current !== this.searchToken) return
        this.results = []
        this.searched = false
        this.searchError = errorMessage(err)
      } finally {
        if (current === this.searchToken) this.searching = false
      }
    },

    /** Drops the suggestions and invalidates any search still in flight. */
    clearSearch() {
      this.searchToken++
      this.results = []
      this.searching = false
      this.searched = false
      this.searchError = null
    },

    /**
     * Picks a starting place without any typing: the browser position first; when that is denied or
     * unavailable, the user's most recent favorite; failing that, an approximate position from the IP.
     * The browser is asked once (later visits only reuse a permission already granted, so there is never
     * a repeated prompt) and only a real answer counts as "asked": a timeout or "unavailable" (common on
     * desktops without GPS) is retried next visit. Never overrides a place the user picked in the
     * meantime and never throws.
     */
    async detectLocation() {
      const coords = await this.browserPosition()
      if (coords) {
        this.detected = {
          name: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }
        if (!this.location) this.select(this.detected)
        return
      }
      if (this.location) return
      const favorite = useFavoritesStore().list[0]
      if (favorite) return this.select(favorite)
      const byIp = await ipLocationService.locate()
      if (byIp && !this.location) this.select(byIp)
    },

    async browserPosition(): Promise<GeolocationCoordinates | null> {
      if (!geolocationSupported()) return null
      if (alreadyAsked() && !(await permissionGranted())) return null
      const result = await getPosition()
      if (answered(result)) markAsked()
      else if (result.coords === null) console.warn(`Geolocation unavailable (code ${result.code})`)
      return result.coords
    },
  },
})
