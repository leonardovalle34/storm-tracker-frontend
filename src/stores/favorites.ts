import { defineStore } from 'pinia'
import type { Location } from '@/types/weather'
import { readPlaces, samePlace, withPlaceFirst, writePlaces } from '@/utils/savedPlaces'

export const FAVORITES_KEY = 'storm-track:favorites'
export const MAX_FAVORITES = 20

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    list: readPlaces(FAVORITES_KEY).slice(0, MAX_FAVORITES) as Location[],
  }),

  getters: {
    isFavorite: (state) => (place: Location) => state.list.some((p) => samePlace(p, place)),
  },

  actions: {
    add(place: Location) {
      this.list = withPlaceFirst(this.list, place, MAX_FAVORITES)
      writePlaces(FAVORITES_KEY, this.list)
    },

    remove(place: Location) {
      this.list = this.list.filter((p) => !samePlace(p, place))
      writePlaces(FAVORITES_KEY, this.list)
    },

    toggle(place: Location) {
      if (this.isFavorite(place)) this.remove(place)
      else this.add(place)
    },
  },
})
