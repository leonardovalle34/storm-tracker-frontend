import { defineStore } from 'pinia'
import type { Location } from '@/types/weather'
import { readPlaces, samePlace, withPlaceFirst, writePlaces } from '@/utils/savedPlaces'

export const HISTORY_KEY = 'storm-track:history'
export const MAX_HISTORY = 10

/** Places the user selected, most recent first, without repeats. */
export const useHistoryStore = defineStore('history', {
  state: () => ({
    list: readPlaces(HISTORY_KEY).slice(0, MAX_HISTORY) as Location[],
  }),

  actions: {
    add(place: Location) {
      this.list = withPlaceFirst(this.list, place, MAX_HISTORY)
      writePlaces(HISTORY_KEY, this.list)
    },

    remove(place: Location) {
      this.list = this.list.filter((p) => !samePlace(p, place))
      writePlaces(HISTORY_KEY, this.list)
    },

    clear() {
      this.list = []
      writePlaces(HISTORY_KEY, this.list)
    },
  },
})
