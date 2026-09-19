export default {
  app: { title: 'Storm Tracker' },
  common: { loading: 'Loading…', error: 'Could not load data.', retry: 'Try again', noLocation: 'Pick a place on the map or search for one.' },
  header: {
    searchLabel: 'Search location',
    searchPlaceholder: 'Search a city or place…',
    searching: 'Searching…',
    noResults: 'No results',
    language: 'Language',
    themeToggle: 'Toggle light/dark theme',
  },
  footer: { madeBy: 'Made by', company: 'Nexus Tecnologia' },
  map: { title: 'Choose a location', label: 'Satellite map', hint: 'Click the map to select a location.' },
  forecast: { title: '16-day forecast', precipitation: 'Precipitation', max: 'Max', min: 'Min' },
  weather: {
    clear: 'Clear sky', partlyCloudy: 'Partly cloudy', overcast: 'Overcast', fog: 'Fog',
    drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', showers: 'Showers', thunderstorm: 'Thunderstorm', unknown: 'Weather',
  },
  wind: {
    title: 'Wind', speed: 'Wind (kt)', direction: 'Direction', hour: 'Hour',
    level: { calm: 'Calm', moderate: 'Moderate', strong: 'Strong', extreme: 'Extreme' },
  },
  moon: {
    'New Moon': 'New Moon', 'Waxing Crescent': 'Waxing Crescent', 'First Quarter': 'First Quarter',
    'Waxing Gibbous': 'Waxing Gibbous', 'Full Moon': 'Full Moon', 'Waning Gibbous': 'Waning Gibbous',
    'Last Quarter': 'Last Quarter', 'Waning Crescent': 'Waning Crescent',
  },
  ocean: { title: 'Ocean', swell: 'Swell (m)', tide: 'Tide (m)', waterTemp: 'Water temp (°C)' },
  models: {
    title: 'Model maps', rain: 'Rain', snow: 'Snow', temp: 'Temperature', waves: 'Waves', sst: 'Water temperature',
    expand: 'Expand map', close: 'Close',
  },
}
