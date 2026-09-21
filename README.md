# Storm Tracker — frontend

A web app that shows the weather and sea forecast for any point on the planet: a 16-day forecast, wind, swell, tides, moon phases, recommended activities (surf, kite, swimming, diving) and alerts for rain, snow, heat, wind, storms and sea conditions.

The frontend has no user accounts and no database of its own: preferences (theme, language, temperature and wind units, favorites, history) live in the browser's `localStorage`. Data comes from the backend (`storm-tracker-backend`), which queries Open-Meteo and Nominatim.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started (step by step)](#getting-started-step-by-step)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Data stored in the browser](#data-stored-in-the-browser)
- [Alerts: rules and thresholds](#alerts-rules-and-thresholds)
- [Languages](#languages)
- [Build and deploy](#build-and-deploy)
- [Code conventions](#code-conventions)
- [Data sources and credits](#data-sources-and-credits)

## Features

- **Choose a location** by search (Nominatim autocomplete), by clicking the satellite map (Leaflet + Esri), or through the browser's geolocation (asked only once).
- **Favorites** (a star on the map strip and on every search result, up to 20) and **history** of the last 10 locations. With the search box empty and focused, the dropdown lists "Favorites" and "Recent searches".
- **Current conditions** ("Now": icon, temperature and wind) on the map strip, whether the map is collapsed or open.
- **16-day forecast** as day cards, with max/min temperature, rain, UV index and per-day alerts. Clicking a card opens a **day detail** with the full 24-hour temperature curve.
- **Wind grid** (sustained wind, gusts and direction) and **ocean grid** (swell, period, direction, tide with chart, water temperature, water visibility and recommended activities), with optional synchronized scrolling across forecast, wind and ocean.
- **Moon phase** for each day.
- **Model maps** (Windy): rain, wind and temperature always; waves and water temperature at coastal locations.
- **Alerts** for rain, snow, heat, wind, storms and sea, with a banner for the next 3 days.
- **Theme** (light/dark), **language** (pt, en, es, fr, de) **temperature unit** (°C/°F) and **wind unit** (kt / km/h).

## Tech stack

| Area                 | Technology                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Framework            | [Vue 3](https://vuejs.org) (Composition API, `<script setup>`)                                           |
| Language             | [TypeScript](https://www.typescriptlang.org) (`strict`)                                                  |
| Build / dev server   | [Vite](https://vite.dev)                                                                                 |
| Styling              | [Tailwind CSS v4](https://tailwindcss.com) (`@tailwindcss/vite` plugin, theme tokens in `src/style.css`) |
| Global state         | [Pinia](https://pinia.vuejs.org) (stores in the Options API style)                                       |
| Internationalization | [vue-i18n](https://vue-i18n.intlify.dev)                                                                 |
| Map                  | [Leaflet](https://leafletjs.com) with Esri World Imagery tiles                                           |
| Testing              | [Vitest](https://vitest.dev) + [Vue Test Utils](https://test-utils.vuejs.org) + jsdom                    |
| Quality              | ESLint (flat config, `typescript-eslint`, `eslint-plugin-vue`), Prettier, `vue-tsc`                      |

## Prerequisites

- **Node.js** `^20.19` or `>=22.12` (a Vite 8 requirement) and **npm**.
- The **backend** (`storm-tracker-backend`, FastAPI) running locally or reachable by URL. To run it locally you also need **Python 3.12** (or Docker).

## Getting started (step by step)

The project is made of two sibling folders/repositories: `storm-tracker-backend` and `storm-tracker-frontend`.

### 1. Start the backend

```bash
cd storm-tracker-backend

python3.12 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the backend root (the first four variables are required):

```dotenv
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1
OPEN_METEO_MARINE_URL=https://marine-api.open-meteo.com/v1
NOMINATIM_URL=https://nominatim.openstreetmap.org/search
NOMINATIM_USER_AGENT=storm-tracker-dev (your-email@example.com)

# optional
# CORS_ORIGINS=["http://localhost:5173"]
# RATE_LIMIT_DEFAULT=30/minute
```

Run the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Check <http://localhost:8000/health> (it should answer `{"status":"ok"}`) and the interactive docs at <http://localhost:8000/docs>.

> Prefer Docker? `docker build -t storm-tracker-api .` then `docker run -p 8000:8080 --env-file .env storm-tracker-api` (the image listens on the port set in `PORT`, 8080 by default).

### 2. Start the frontend

```bash
cd storm-tracker-frontend

npm install
cp .env.example .env              # points to http://localhost:8000
npm run dev
```

Open <http://localhost:5173>. On load the browser asks for location permission; if you decline, pick a place on the map or in the search box.

### 3. Check that everything works

```bash
npm run lint
npm run build      # type-check (vue-tsc) + production build
npm test
```

## Environment variables

| Variable            | Where             | Default                 | Description                                                                                                  |
| ------------------- | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_API_BASE_URL` | frontend (`.env`) | `http://localhost:8000` | Backend base URL, without a trailing slash. It must start with `VITE_` for Vite to expose it to the browser. |

The `.env` file is not committed (it is in `.gitignore`); use `.env.example` as a template. Changed the `.env`? Restart `npm run dev`.

The backend reads `OPEN_METEO_BASE_URL`, `OPEN_METEO_MARINE_URL`, `NOMINATIM_URL`, `NOMINATIM_USER_AGENT`, `CORS_ORIGINS` (default: any origin) and `RATE_LIMIT_DEFAULT` (default `30/minute`).

### Backend endpoints used

| Endpoint                  | Parameters    | Returns                                                                    |
| ------------------------- | ------------- | -------------------------------------------------------------------------- |
| `GET /weather/geocode`    | `name`        | Places (Nominatim)                                                         |
| `GET /weather/forecast`   | `lat`, `lon`  | Daily and hourly forecast (temperature in °C, wind in knots) and `current` |
| `GET /weather/marine`     | `lat`, `lon`  | Waves, swell, tide and water temperature                                   |
| `GET /weather/moon-phase` | `target_date` | Moon phase for the day                                                     |

The `current` field (current temperature, weather code and wind) is optional for the frontend: if the backend does not send it, the "Now" row is simply not shown.

## Scripts

| Command                           | What it does                                             |
| --------------------------------- | -------------------------------------------------------- |
| `npm run dev`                     | Development server with hot reload                       |
| `npm run build`                   | Type-checks (`vue-tsc --noEmit`) and builds into `dist/` |
| `npm run preview`                 | Serves the production build locally                      |
| `npm test`                        | Runs all tests once (`vitest run`)                       |
| `npm run test:watch`              | Tests in watch mode                                      |
| `npm run lint` / `lint:fix`       | ESLint (with autofix)                                    |
| `npm run format` / `format:check` | Prettier (write / check only)                            |

## Testing

Tests live next to the code (`*.spec.ts`), run in jsdom and cover components, stores, services and utilities.

```bash
npm test                               # everything
npx vitest run src/stores              # one folder
npx vitest run src/utils/alerts.spec.ts
npx vitest run --coverage              # coverage (v8)
```

How the tests work:

- `src/test/setup.ts` creates a **fresh Pinia before every test**, shared by every mounted component and by direct store calls. You do not need to pass Pinia to `mount`.
- **Components** are tested with the real Pinia and **mocked services** (`vi.mock('@/services/...')`). No test hits the network.
- **Stores** have their own specs that mock the matching service.
- New business rules (favorites, history, alerts, temperature conversion) were written test-first: the spec comes before the implementation.
- `src/test/fixtures.ts` has generators for forecast and marine data.

## Architecture

The core rule: **no component calls a service directly**. The flow is always:

```
Component ──► Store (action) ──► Service (HTTP) ──► Store (updates state) ──► Component (reads with storeToRefs)
```

- **Services** (`src/services`): only make the HTTP call and return the data. No state, no business logic. `http.ts` holds the shared `get` and `ApiError`.
- **Stores** (`src/stores`): hold the global state and the logic that changes it. All use the Options API (`defineStore('id', { state, getters, actions })`). Async actions follow the `loading = true` → `error = null` → `try/catch/finally` pattern.
- **Components**: use `storeToRefs()` to read reactive state and call the store's actions directly.
- **Composables** (`src/composables`): pure reusable logic without state of their own (e.g. `useDebounceFn`, `useSyncedScroll`).
- **Utils** (`src/utils`): pure functions (alert classification, activity scoring, conversions, formatting, tides, moon, etc.).

### Stores

| Store        | Holds                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| `location`   | Selected location, geolocation result, search results and state                        |
| `weather`    | Forecast and marine data, `loading`/`error`, `isCoastal`, moon phases (cached by date) |
| `favorites`  | Favorites list (persisted)                                                             |
| `history`    | Last selected locations (persisted); `location.select` writes here                     |
| `theme`      | Light/dark theme (persisted)                                                           |
| `language`   | Active language (vue-i18n remains the source of truth)                                 |
| `units`      | Temperature unit °C/°F and wind unit kt / km/h (persisted)                             |
| `scrollSync` | Synchronized-scrolling preference (persisted)                                          |

## Project structure

```
src/
├── App.vue                  # page composition
├── main.ts                  # creates the app, Pinia, i18n and applies the saved theme
├── style.css                # Tailwind + theme tokens (light/dark)
├── components/              # one component per folder: Name/Name.vue + Name.spec.ts
│   ├── AppHeader/  AppFooter/  LocationSearch/  LocationPicker/  LocationMap/
│   ├── CurrentWeather/  ForecastCards/  DayDetailModal/  HourlyTempChart/  WindGrid/  OceanGrid/  TideChart/
│   ├── ModelMaps/  MoonPhase/  AlertIcon/  ConditionBadge/  ActivityCell/
│   └── ThemeToggle/  LanguageSelect/  UnitToggle/  WindUnitToggle/  SyncToggle/  FavoriteStar/ ...
├── stores/                  # Pinia (one store per file, with a spec)
├── services/                # HTTP calls (weatherService, geocodeService, http)
├── composables/             # reusable logic without state
├── utils/                   # pure functions (alerts, activityScorer, temperature, ...)
├── i18n/                    # setup and locales (pt, en, es, fr, de)
├── types/                   # API response types
└── test/                    # Vitest setup, fixtures and helpers
```

## Data stored in the browser

Nothing is sent to any server: everything stays in `localStorage`.

| Key                            | Content                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `st-theme`                     | `light` or `dark`                                                      |
| `st-locale`                    | `pt`, `en`, `es`, `fr` or `de`                                         |
| `st-scroll-sync`               | `on` or `off`                                                          |
| `st-geo-asked`                 | `1` once the location permission has been requested (avoids re-asking) |
| `storm-track:temperature-unit` | `C` or `F`                                                             |
| `storm-track:favorites`        | List of `{name, lat, lon}` (max 20)                                    |
| `storm-track:history`          | List of `{name, lat, lon}`, most recent first (max 10)                 |

If `localStorage` is unavailable (private window, blocked storage), the app keeps working, it just does not persist anything.

## Alerts: rules and thresholds

These are **estimates from a forecast model, not official alerts**. Every icon has a tooltip saying so and recommending confirmation with the local civil defense (land) or the harbor master/Navy (sea). The functions live in `src/utils/alerts.ts`.

| Category | Moderate   | High                           | Severe                         | Based on                                                                              |
| -------- | ---------- | ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------- |
| Rain     | ≥ 20 mm    | ≥ 50 mm                        | ≥ 100 mm                       | daily precipitation                                                                   |
| Snow     | ≥ 5 mm     | ≥ 15 mm                        | ≥ 30 mm                        | daily precipitation (water equivalent), on a snow day                                 |
| Heat     | 33–38 °C   | 38–44 °C                       | > 44 °C                        | daily max apparent temperature (`apparent_temperature_max`; the backend must send it) |
| Wind     | 40–60 km/h | 60–100 km/h                    | > 100 km/h                     | worse of the day's strongest hourly wind and gust (knots → km/h)                      |
| Storm    | code 95    | —                              | code 96 or 99                  | daily `weather_code`                                                                  |
| Sea      | wave ≥ 2 m | wave ≥ 2.5 m or wind ≥ 50 km/h | wave ≥ 3.5 m or wind ≥ 60 km/h | only where ocean data exists                                                          |

- Colors: yellow (moderate), orange (high), red (severe). Days with no alert show nothing.
- A day with a snow code, or with a thunderstorm code and a maximum temperature ≤ 0 °C, is treated as **snow** (not rain or storm).
- The **banner** above the forecast appears when there is a high or severe level in the **first 3 days**, and lists the categories, the worst level and the dates.
- The rain and snow thresholds are estimates and can be tuned in the `classify*Severity` functions.

## Languages

Portuguese, English, Spanish, French and German (`src/i18n/locales`). On the first visit the app uses the browser language when supported, otherwise Portuguese. The choice is saved.

To add a language:

1. Copy `src/i18n/locales/en.ts` to `src/i18n/locales/<code>.ts` and translate it (keep the `{placeholders}`).
2. In `src/i18n/index.ts`, import the file and add the code to `LocaleCode`, `LOCALES` and `messages`.
3. Run `npm test`: `i18n.spec.ts` checks that every language has the same keys and placeholders.

## Build and deploy

```bash
npm run build      # produces dist/
npm run preview    # check the build locally
```

The output in `dist/` is static and can be served by any static file host. Set `VITE_API_BASE_URL` **at build time** to the production API, since Vite bakes the value into the code. The backend must allow the frontend's origin in `CORS_ORIGINS`.

## Code conventions

- Prettier: no semicolons, single quotes, `printWidth` 110, trailing commas (`.prettierrc.json`).
- Imports use the `@/` alias (= `src/`), never long relative paths across folders.
- One component per folder, with its spec next to it.
- Global state only in stores; components never import services.
- Before opening a PR: `npm run lint && npm run build && npm test`.

## Data sources and credits

- Forecast and marine data: [Open-Meteo](https://open-meteo.com) (through the backend).
- Place search: [Nominatim / OpenStreetMap](https://nominatim.org) (through the backend; respect the usage policy, about 1 request per second, which is why search is debounced and needs at least 3 characters).
- Satellite imagery: Esri World Imagery (Esri, Maxar, Earthstar Geographics and the GIS User Community).
- Model maps: [Windy](https://www.windy.com) (embed).

Made by Nexus Tecnologia.
