import { defineStore } from 'pinia'
import * as geocodeService from '@/services/geocodeService'
import type { Location } from '@/types/weather'
import { errorMessage } from '@/utils/errors'
import {
  alreadyAsked,
  geolocationSupported,
  getPosition,
  markAsked,
  permissionGranted,
} from '@/utils/geolocation'
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
     * First visit: ask the browser once and, if allowed, select the user's position. Later visits only
     * reuse a permission the browser already granted, so there is never a repeated prompt. Never
     * overrides a place the user picked in the meantime and never throws.
     */
    async detectLocation() {
      if (!geolocationSupported()) return
      if (alreadyAsked() && !(await permissionGranted())) return
      markAsked()
      const coords = await getPosition()
      if (!coords) return
      this.detected = {
        name: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }
      if (!this.location) this.select(this.detected)
    },
  },
})
