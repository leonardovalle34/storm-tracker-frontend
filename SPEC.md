# Storm Tracker — Specification

Living reference for the **frontend**: requirements, technical decisions and business rules. It documents what the code does **today**. Where the code differs from what was planned or discussed, or looks unfinished, it is called out in [Discrepancies and findings](#discrepancies-and-findings) instead of being described as if it worked.

> Last verified against the code on 2026-09-19 (frontend on branch `develop`, backend read from the sibling folder `storm-tracker-backend`).

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Backend integration](#backend-integration)
5. [Features by page section](#features-by-page-section)
6. [Classification rules and thresholds](#classification-rules-and-thresholds)
7. [Internationalization](#internationalization)
8. [User preferences (localStorage)](#user-preferences-localstorage)
9. [Responsiveness and accessibility](#responsiveness-and-accessibility)
10. [Known limitations](#known-limitations)
11. [Pending / next steps](#pending--next-steps)
12. [Discrepancies and findings](#discrepancies-and-findings)

## Overview

**What it is.** Storm Tracker is a single-page web app that shows the weather **and the sea** for any point on the planet. From one location it presents a 16-day forecast, hourly wind, swell and tide, moon phases, model maps, water visibility, rule-based activity recommendations (surf, kite/windsurf, swimming, diving) and safety-oriented alerts (rain, snow, heat, wind, storm, sea).

**Value proposition.** Ocean-going and outdoor users usually juggle several sites (a forecast site, a wind map, a tide table, a wave model). Storm Tracker brings them into one page, aligned day by day, and turns raw numbers into a quick reading (colors, scores, alerts).

**Audience.** Surfers, kite/windsurfers, swimmers, divers, boaters and anyone planning outdoor days near the coast. It works inland too: ocean sections appear only where the marine model has data.

**Non-goals (today).** No user accounts, no server-side storage, no push notifications, and it is **not** an official warning service (see [alert disclaimer](#disclaimer)).

## Tech stack

| Area       | Choice                                                                               | Notes                                                                                       |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Framework  | Vue 3 (Composition API, `<script setup>`)                                            |                                                                                             |
| Language   | TypeScript, `strict`                                                                 | Alias `@/` → `src/`                                                                         |
| Build      | Vite                                                                                 | `vue-tsc --noEmit` runs before `vite build`                                                 |
| Styling    | Tailwind CSS v4                                                                      | Design tokens as CSS variables in `src/style.css`, light values in `:root`, dark in `.dark` |
| State      | Pinia, **Options API** (`defineStore('id', { state, getters, actions })`)            | Stores in `src/stores/`                                                                     |
| HTTP       | `fetch` wrapped in `src/services/http.ts`                                            | Services in `src/services/`, HTTP only                                                      |
| i18n       | vue-i18n (`legacy: false`)                                                           |                                                                                             |
| Map        | Leaflet + Esri World Imagery tiles + Esri "Boundaries and Places" label layer on top |                                                                                             |
| Model maps | Windy.com `embed2.html` iframes                                                      |                                                                                             |
| Tests      | Vitest + Vue Test Utils + jsdom                                                      | Specs next to each unit                                                                     |
| Quality    | ESLint (flat), Prettier, `vue-tsc`                                                   |                                                                                             |

## Architecture

### Data flow

```
Component ──► Store (action) ──► Service (HTTP) ──► Store (updates state) ──► Component (reads via storeToRefs)
```

Rules:

1. **No component imports or calls a service.** Only stores do.
2. Services only perform the HTTP call and return the data: no state, no business logic (beyond normalizing the geocode response shape).
3. Components read reactive state with `storeToRefs()` (never by destructuring the store) and call actions directly on the store.
4. Async actions that call a service follow: `loading = true` → `error = null` → `try / catch / finally`, storing `error.message`. Actions decide case by case whether to swallow the error into `error` or re-throw. Today none re-throws, because no component needs to react to an exception.
5. Composables hold only pure, reusable logic without state of their own (`useDebounceFn`, `useSyncedScroll`).
6. Pure business rules live in `src/utils/` and are unit-tested in isolation.

### Stores

| Store        | State                                                                                    | Notes                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `location`   | `location`, `detected`, search `results` / `searching` / `searched` / `searchError`      | `select()` also records the place in `history`; `detectLocation()` implements the "ask once" geolocation flow |
| `weather`    | `forecast`, `marine`, `loading`, `error`, `moonPhases`, `moonErrors`; getter `isCoastal` | `load()` fetches forecast + marine together; a stale response never overwrites a newer one                    |
| `favorites`  | `list`                                                                                   | Persisted; max 20                                                                                             |
| `history`    | `list`                                                                                   | Persisted; max 10; most recent first                                                                          |
| `theme`      | `theme`                                                                                  | Persisted                                                                                                     |
| `language`   | getters `locale`, `locales`; action `setLocale`                                          | vue-i18n stays the source of truth                                                                            |
| `units`      | `temperature` (`C`/`F`)                                                                  | Persisted                                                                                                     |
| `scrollSync` | `enabled`                                                                                | Persisted                                                                                                     |

### Folder structure

```
src/
├── App.vue, main.ts, style.css, env.d.ts
├── components/<Name>/<Name>.vue (+ <Name>.spec.ts)   one folder per component
├── stores/          Pinia stores, each with a spec
├── services/        http.ts, weatherService.ts, geocodeService.ts (+ specs)
├── composables/     useDebounceFn, useSyncedScroll
├── utils/           pure rules: alerts, activityScorer, activityPlanner, waterClarity, wind, windShore,
│                    uv, tide, temperature, forecast, hourly, moon, weatherCode, windy, savedPlaces, ...
├── i18n/            index.ts + locales/{pt,en,es,fr,de}.ts
├── types/           weather.ts (API response types)
└── test/            setup.ts, fixtures.ts, helpers.ts
```

### Testing conventions

- Vitest with jsdom; specs are `*.spec.ts` **next to** the unit they test.
- `src/test/setup.ts` creates a fresh Pinia before every test and registers it for all mounted components, so tests do not pass it to `mount`.
- Component tests use the real Pinia with **mocked services** (`vi.mock('@/services/...')`); store tests mock the matching service. No test touches the network.
- Business rules (favorites, history, alert classification, temperature conversion) were written test-first.
- Theme tokens have contrast tests (WCAG ratios) in `src/theme.spec.ts`.

## Backend integration

Base URL: environment variable **`VITE_API_BASE_URL`** (default `http://localhost:8000`, trailing slash removed). See [the naming discrepancy](#discrepancies-and-findings). Errors from the API are surfaced as `ApiError` with `status` and, when the backend sends a FastAPI `detail` string, `detail`.

### Endpoints consumed

| Endpoint                  | Query                        | Used by                 | Frontend expectations                                                                                                                                      |
| ------------------------- | ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /weather/geocode`    | `name`                       | `location.search`       | Array of Nominatim items `{display_name, lat, lon}` (strings for lat/lon). The `{results: [{name, latitude, longitude, country}]}` shape is also accepted. |
| `GET /weather/forecast`   | `lat`, `lon`                 | `weather.load`          | See below                                                                                                                                                  |
| `GET /weather/marine`     | `lat`, `lon`                 | `weather.load`          | See below                                                                                                                                                  |
| `GET /weather/moon-phase` | `target_date` (`YYYY-MM-DD`) | `weather.loadMoonPhase` | `{date, phase_index, phase_name}`; a `400` carries `detail`                                                                                                |

**Forecast fields used** (Open-Meteo, requested with `wind_speed_unit=kn`, `timezone=auto`, 16 days, so wind is in **knots**, temperature in **°C**, precipitation in **mm**):

- `daily`: `time`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, `weather_code`, `uv_index_max`, `sunrise`, `sunset`, and `apparent_temperature_max` (optional: without it there is simply no heat alert; the backend does not request it yet, see findings)
- `hourly`: `time`, `wind_speed_10m`, `wind_direction_10m`, `precipitation` (rain of the previous 24 h for water visibility). `temperature_2m` is requested by the backend but not used by the UI. `weather_code` per hour is **not** sent; the daily code is used instead.
- `current` (optional): `temperature_2m`, `weather_code`, `wind_speed_10m` (knots, same request). If absent, the "Now" row is simply omitted.

**Marine fields used** (`hourly`): `time`, `wave_height`, `swell_wave_height`, `swell_wave_direction`, `swell_wave_period`, `sea_level_height_msl`, `sea_surface_temperature`.

**Backend behavior relevant to the frontend:** every route is rate-limited (default `30/minute`, per `RATE_LIMIT_DEFAULT`); upstream failures become `502`; CORS origins come from `CORS_ORIGINS` (default any). The moon phase is computed locally in the backend (`astral`), not by Open-Meteo.

## Features by page section

The page (`App.vue`) is, top to bottom: header → location picker (map) → status message → forecast → wind → ocean → model maps → footer.

### Header

- Sticky navy bar (`bg-brand`, the logo color, **identical in both themes**).
- Round logo, **location search**, **language select**, **temperature-unit toggle** (°C/°F) and **theme switch**.
- **Location search** (`LocationSearch`, `location` store):
  - Live results from `/weather/geocode`, **debounced 500 ms**, minimum **3 characters** (trimmed). This keeps the public Nominatim under its ~1 request/second policy. Only typing triggers a search; programmatic changes to the field do not.
  - Stale responses are ignored (token per search).
  - **Empty field + focus:** the dropdown shows **Favorites** (filled star) then **Recent searches** (clock icon); places that are favorites are not repeated under Recent.
  - Every row has a star that toggles the favorite without selecting the place. Arrow keys / Enter / Escape work over whichever list is shown (combobox semantics).
  - Picking a place selects it, fills the field with its name and clears the suggestions. Choosing a place elsewhere (map click, geolocation) clears whatever is typed.
- **Theme switch** shows the current theme next to the icon and has an explanatory tooltip; it deliberately uses a switch icon, never sun/moon.

### Location picker (map)

- **Expanded** (until a place exists): title, satellite map, minimize button, hint "Click the map to select a location", and the **current-conditions row** inside the same bordered box as the map.
- **Collapsed** (after any selection: search, click or geolocation): a compact strip in one bordered box, top row = pin, place name, **favorite star**, "Change location"; bottom row = current conditions. The collapse/expand is a height animation (`grid-template-rows` 0fr↔1fr); the map is re-measured after it.
- **Map click** selects coordinates; the name is then `"lat, lon"` with 4 decimals (see [limitations](#known-limitations)). Clicks keep the user's zoom; a search pick recenters at zoom 9.
- **Current conditions ("NOW")**: label, weather icon (from `weather_code`, tooltip with the description), temperature in the chosen unit, wind in knots. Shown only if a place is selected **and** `forecast.current` has at least one value; individual missing values are omitted.
- **Geolocation on first visit:** the browser is asked **once** (flag `st-geo-asked`). Later visits only reuse a permission already granted. It never overrides a place the user picked meanwhile and never throws or shows an error if denied.
- **History:** every `select` / `selectCoords` (search, map click, geolocation) is recorded (max 10, most recent first, deduplicated by coordinates).

### 16-day forecast (`ForecastCards`)

- One card per day in a horizontally scrolling row: weekday + date, weather icon (from the daily `weather_code`), max/min temperature (chosen unit), precipitation, **UV badge** (fixed-size chip with the index, colored by WHO level; the level name is in the tooltip) and the **alert row**.
- The **last requested day** usually comes back with null data (the model reaches ~15 days); trailing days without data are dropped instead of rendered as zeros. Gaps in the middle are kept.
- The **alert row** appears only on days that have at least one active alert; quiet days show nothing. Icons are colored yellow / orange / red and each has a tooltip (see [alerts](#alerts)). The **sea** alert appears only when the location has ocean data.
- The **banner** above the cards appears when any category is **high or severe within the first 3 days**. It lists each category once, at its worst level, with the dates on which it is high or severe, plus a "model estimate, not an official alert" note. Its color is orange (worst = high) or red (worst = severe).
- A **scroll-sync toggle** in this header links the three horizontal scrollers (see [Scroll sync](#scroll-sync)).

### Wind grid (`WindGrid`)

- Hourly columns every **3 h from 03h to 21h** (7 per day), days side by side in one horizontally scrolling table with a sticky label column.
- Rows: wind speed in **knots** (colored cell) and direction (arrow + tooltip in degrees). Each day header shows the **moon phase**.
- The arrow points **downwind**: `wind_direction_10m` is where the wind comes from, so the rotation is `direction + 180°`.
- Color = wind level (see [Wind level](#wind-level)); colors come from theme token pairs designed per theme.

### Ocean grid (`OceanGrid`)

Shown only if the location is **coastal** (`isCoastal`: the API returned at least one non-null `wave_height`; there is no geographic logic) and marine data loaded.

- Same 3-hour columns and day layout as the wind grid. Each day header: date, moon phase and a **"long-term estimate"** flag for days at/after the first day whose marine data has gaps (never hidden, only flagged).
- **Tide curve** per day (see [Tide chart](#tide-chart)).
- Hourly rows: **swell height** (m), **period** (s), **swell direction**, **tide** (m, `sea_level_height_msl`), **water temperature** (chosen unit, one decimal). Missing values show a dash.
- Below the data rows, per day:
  - **Water visibility** badge: an _estimate_, not a measurement (see [Water visibility](#water-visibility)).
  - **Recommended activities** for surf, kite/windsurf, swimming, diving, each with a badge and a best time window (see [Activity scoring](#activity-scoring)).

### Tide chart

- One SVG per day, spanning that day's 7 columns so hour labels line up with the table below.
- Smooth curve (Catmull-Rom converted to Bézier) with gradient fill; local **peaks and valleys** are marked and labeled with their value in meters, with label placement that avoids overlaps (day max/min get priority).
- With fewer than 2 valid points the chart is not drawn and the cell shows "No data".

### Model maps (`ModelMaps`)

- Windy embeds (`embed2.html`, ECMWF, zoom 5) centered on the selected place. **Always:** precipitation, wind, temperature. **Coastal only:** waves, water temperature.
- Before any place is chosen the maps center on Santos, SP (`-23.96, -46.33`) and only the three "always" maps show.
- Each map is covered by a transparent button that opens a **modal** with a bigger map (zoom 7, Windy menu visible). `<dialog>` is used, closes with the button, backdrop click or Esc.
- Wind unit on the maps is knots; temperature unit follows the app setting (`°C`/`°F`).

### Footer

- Same fixed navy as the header, full logo (light-lettered variant), "Made by Nexus Tecnologia" linking to `https://nexustecnologia.online` (`noopener noreferrer`).

### Scroll sync

Forecast cards, wind grid and ocean grid share one scroll group. Positions are shared in **days**, not pixels (each scroller reports its pixels-per-day), so the three always show the same day. Default on, toggled from the forecast header, persisted.

### Other behaviors

- **Loading / error:** while loading a "Loading…" status is shown; if the _forecast_ fails an alert message is shown. A _marine_ failure never breaks the forecast (`Promise.allSettled`): the ocean sections just do not appear.
- **Moon phase:** fetched per date and **cached across locations** (it depends only on the date). Concurrent requests for the same date share one call. A `400` is shown inline ("Invalid date"); any other failure hides the indicator and is retried next time.
- **Temperature unit:** display-only conversion (API is always °C). Applies to forecast cards, current conditions, ocean water temperature and Windy maps. Conversion rounds **after** converting.

## Classification rules and thresholds

Everything below is implemented in `src/utils/` and covered by specs. Units: wind in **knots** unless noted, waves in meters, swell period in seconds, directions are "coming from" bearings.

### Disclaimer

**Alerts, activity recommendations and water visibility are estimates produced by hand-written rules over forecast-model output. They are not official warnings and not measurements.** Each alert icon says so in its tooltip and points to the local civil defense (land categories) or harbor master / Navy (sea) for confirmation before any safety-related decision.

### Wind level

`windLevel(knots)` in `utils/wind.ts` (drives the wind grid colors): `< 10` calm, `< 20` moderate, `< 30` strong, otherwise extreme. Colors are token pairs (`--wind-*-bg/fg`), different per theme (not a darkened copy), AA-checked.

### Wind relative to the shore

`windShoreType(windDir, swellDir)` in `utils/windShore.ts`. The code has **no coastline orientation**, so the swell direction stands in for "where the open sea is": angular difference `≤ 45°` → **onshore**, `≥ 135°` → **offshore**, otherwise **cross**.

### UV

`uvLevel(index)` (WHO scale on the rounded index): 0–2 low, 3–5 moderate, 6–7 high, 8–10 very high, 11+ extreme. Tone mapping: low → green, moderate → yellow, high → orange, very high and extreme → red.

### Activity scoring

`utils/activityScorer.ts` — a **rule-based heuristic, not machine learning** (base + bonuses/penalties, clamped to 0–100; thresholds are rules of thumb meant to be tuned by hand). Weather category from WMO code: `≥ 95` stormy, `≥ 51` rainy, `≤ 1` sunny, otherwise cloudy (codes 4–50 count as cloudy, 83–94 as rainy).

**Safety rule, applied first:** a thunderstorm (`weather_code ≥ 95`) sets **every activity to 0**.

| Activity        | Rule                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surf            | Base 50. Wind vs shore: offshore +25, cross +5, onshore −25. Period: > 10 s +15, < 6 s −20. Wind speed: < 8 kt +5, > 20 kt −20. Wave height outside 0.4–3 m: −40 |
| Kite / windsurf | Wind speed only, piecewise-linear through `(kt, score)`: (0,0) (8,10) (12,30) (15,85) (20,100) (25,85) (35,35) (45,10) (60,0)                                    |
| Swimming        | Base 100; −4 per kt above 12; −40 per m above 1 m; rain −30; storm = 0                                                                                           |
| Diving          | Base 80; sunny +20; −5 per kt above 10; −50 per m above 0.8 m; rain −35; storm = 0                                                                               |

Bands: `≥ 75` great, `≥ 55` good, `≥ 35` fair, otherwise poor.

**Daily recommendation** (`utils/activityPlanner.ts`): each **daylight hour** (from sunrise/sunset; 6h–17h if unknown) is scored; the **best window** is the peak hour plus contiguous neighbors within **10 points** of it, and the day's score is the window average. If every scored hour is stormy the day shows "not recommended — storm". A day without marine data gets no recommendation. Weather uses the hourly code if the API provides one, otherwise the daily code; an unknown code counts as neutral (cloudy).

### Water visibility

`utils/waterClarity.ts` (internally still named _clarity_; the UI label is "Water visibility"). An **estimate** — no API reports underwater visibility. Start at 100 and subtract: waves above 0.3 m × 35 per meter (max 60); wind above 8 kt × 2.5 per knot; rain in the previous 24 h × 2 per mm (max 40); swell period under 6 s −10. Clamped to 0–100. Daily value = average over daylight hours. Labels: `≥ 80` excellent, `≥ 60` good, `≥ 40` fair, otherwise low.

### Alerts

`utils/alerts.ts`. Severity is `none | moderate | high | severe`; the UI shows yellow, orange, red.

| Category | Function                              | Moderate  | High                        | Severe                      | Input                                                                                  |
| -------- | ------------------------------------- | --------- | --------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| Rain     | `classifyRainSeverity(mm)`            | ≥ 20      | ≥ 50                        | ≥ 100                       | daily `precipitation_sum`                                                              |
| Snow     | `classifySnowSeverity(mm)`            | ≥ 5       | ≥ 15                        | ≥ 30                        | daily `precipitation_sum` (water equivalent, ≈ 1 mm = 1 cm of snow)                    |
| Heat     | `classifyHeatSeverity(°C)`            | 33 – < 38 | 38 – ≤ 44                   | > 44                        | daily `apparent_temperature_max` ("feels like"), in °C; ignored if the field is absent |
| Wind     | `classifyWindSeverity(km/h)`          | 40 – < 60 | 60 – ≤ 100                  | > 100                       | strongest **hourly** `wind_speed_10m` of the day, converted from knots (× 1.852)       |
| Storm    | `classifyStormSeverity(code)`         | code 95   | —                           | code 96 or 99               | daily `weather_code`                                                                   |
| Sea      | `classifySeaSeverity(waveM, windKmh)` | wave ≥ 2  | wave ≥ 2.5 **or** wind ≥ 50 | wave ≥ 3.5 **or** wind ≥ 60 | daily max `wave_height` and the same daily max wind; **only with ocean data**          |

Details and edge cases:

- Lower bounds are inclusive; wind severe is strictly above 100 km/h. A missing input is treated as `none`.
- Sea takes the worst of wave and wind: wind alone can raise it even with small waves (e.g. 0.5 m + 50 km/h → high; 45 km/h alone → none). High sea shows "Not recommended for small boats"; severe shows "Avoid navigation".
- **Snow replaces rain** on a snow day: a daily code of 71–77, 85 or 86 (the same codes that show the snow icon), **or** a thunderstorm code (95/96/99) on a day whose maximum temperature is `≤ 0 °C` (thundersnow: the daily code is the _worst hour_, so one thundery hour on a frozen day would otherwise read as a storm). On such days the storm alert is suppressed. Freezing-rain codes (66/67) stay rain.
- Heat limits are in °C; the tooltip shows them in the unit the user chose (33/38/44 °C = 91/100/111 °F). Heat is evaluated on every day, including snow days.
- Category order is stable: rain/snow, heat, wind, storm, sea.
- **Banner rule:** any `high` or `severe` within the **first 3 days** of the forecast (`WARNING_DAYS = 3`). Each category appears once, at its worst level, with its high/severe dates.

## Internationalization

- Languages: **Portuguese (default), English, Spanish, French, German** — `src/i18n/locales/{pt,en,es,fr,de}.ts`, registered in `src/i18n/index.ts`.
- First visit: the **primary browser language** (`navigator.language`, first two letters) is used if supported, otherwise Portuguese. Only the primary language is considered, not the browser's preference list. The automatic pick is not saved; an explicit choice is (`st-locale`) and sets `<html lang>`.
- A spec enforces that all locales have **identical keys** and identical `{placeholders}`.
- Dates use `Intl.DateTimeFormat` with the active locale, on `YYYY-MM-DD` strings built as local dates (no timezone shift).
- The French and German texts were written without a native-speaker review.
- Not translated by the app: the **Windy** embeds and the Esri map tiles/labels (see [limitations](#known-limitations)).

## User preferences (localStorage)

Nothing is sent to a server. If storage is unavailable every read/write is guarded and the app keeps working without persistence.

| Key                            | Value                                                       | Default                     |
| ------------------------------ | ----------------------------------------------------------- | --------------------------- |
| `st-theme`                     | `light` / `dark`                                            | `light`                     |
| `st-locale`                    | `pt` / `en` / `es` / `fr` / `de`                            | browser language, else `pt` |
| `st-scroll-sync`               | `on` / `off`                                                | on                          |
| `st-geo-asked`                 | `1` after the geolocation prompt was shown once             | absent                      |
| `storm-track:temperature-unit` | `C` / `F`                                                   | `C`                         |
| `storm-track:favorites`        | JSON array of `{name, lat, lon}`, max 20, newest first      | empty                       |
| `storm-track:history`          | JSON array of `{name, lat, lon}`, max 10, most recent first | empty                       |

Notes: places are considered the same when their coordinates match to 4 decimals, whatever their name. Corrupt or malformed stored JSON is ignored. The naming is inconsistent (`st-*` vs `storm-track:*`), see [findings](#discrepancies-and-findings).

## Responsiveness and accessibility

**Responsiveness.**

- Layout is a single column with a `max-w-6xl` container and 16 px side gutters. Wide content (forecast cards, wind grid, ocean grid) scrolls horizontally inside its own container, so the page itself does not scroll sideways.
- The header wraps: on narrow screens the search box drops to its own full-width row; from `sm` it sits inline. The model maps use 1 column on phones, 2 from `sm`, 3 from `lg`.
- Tailwind defaults are mobile-first. **This was not verified on real devices or in a browser** as part of this document; only the class usage was read.

**Accessibility.**

- **Contrast:** theme token pairs are tested against WCAG AA 4.5:1 in **both themes** (`src/theme.spec.ts`): base text and muted text on `bg`/`surface`, all four wind-level pairs, the ocean accent, and a stronger border for day dividers. Alert colors reuse the wind pairs, so they inherit that check. Contrast of every ad-hoc combination in components (for example the header's placeholder text or the footer's 85%-opacity text) is **not** tested.
- **Semantics:** the search is a `combobox` with `listbox`/`option`; toggles are `role="switch"` or `aria-pressed` buttons; icons carry `aria-label`s; tooltips are linked with `aria-describedby`; the modal is a native `<dialog>`; the map and the collapsed/expanded regions use `inert` so hidden content is not focusable.
- **Not color-only:** wind cells show their number, alerts show an icon plus text in the tooltip/banner, the theme switch shows the theme name.
- **Motion:** transitions use `motion-reduce:transition-none` where present.
- **Tooltips on alert icons and UV chips use the native `title` attribute**, which does not appear on keyboard focus (the full text is also in `aria-label`).

## Known limitations

- **Windy embeds ignore the app language.** The embed URL carries no language parameter, so Windy follows the browser.
- **Ocean-model reliability drops with distance.** Wave-model data thins out after roughly the first 7–10 days. The code does not hard-code a day: it flags every day **from the first one with missing marine data** as a "long-term estimate" (the cut varies per location).
- **No reverse geocoding.** A place chosen by map click or by browser geolocation is named by its coordinates (`"-23.9600, -46.3300"`); the backend has no reverse-geocode endpoint. The same name goes into favorites and history.
- **Alerts use the sustained 10 m wind, not gusts.** Blizzard-like conditions (heavy snow with strong gusts, e.g. gusts around 100 km/h with sustained wind under 15 km/h) produce a **snow** alert but no wind alert. The backend does not request `wind_gusts_10m` or `snowfall`.
- **One weather code per day.** The daily code is the worst hour of the day, and alerts and the day icon depend on it. On a frozen day with one thundery hour the _icon_ still shows a thunderstorm even though the alert correctly reads snow.
- **Alert and activity thresholds are hand-set, not taken from an official standard** (see findings). Rain and snow thresholds in particular are estimates.
- **The 3-day banner does not look further ahead.** Severe conditions on day 6 appear on that day's card but not in the banner.
- **Units:** only temperature is switchable. Wind is always knots (alert texts are in km/h); waves and tides are always meters; precipitation always mm.
- **Coastal detection is by data, not geography** (any non-null `wave_height`); a location right at a lake or bay may or may not show ocean sections depending on the model.
- **Rate limits.** The backend allows 30 requests/minute per client by default; a page load makes 2 requests plus one per distinct visible date for the moon phase (cached), plus geocode requests while typing.
- **Translations** for French and German have not been reviewed by native speakers.
- **Leaflet tile attribution and Windy content** are third-party and outside the app's control.

## Pending / next steps

Not implemented — listed as planned, not as existing behavior:

- **Push notifications** (postponed). Nothing for it exists in the code (no service worker, no permission flow).
- **Phase 2 of the roadmap: history with cache.** The current "history" is only the list of recently selected places; there is no weather history and no response cache beyond the moon-phase cache.
- **Reverse geocoding** in the backend (to name places picked on the map).
- **Blizzard / gust alerts**, which need `wind_gusts_10m` and `snowfall` from the backend.
- A configurable alert window and sources for the thresholds (see below).

## Discrepancies and findings

Points where the code differs from what was discussed or planned, or looks unfinished. None of these has been changed by this document.

1. **Env var name.** The planned name was `VITE_API_URL`; the code, `.env.example` and README use **`VITE_API_BASE_URL`**. This spec documents the real one.
2. **`windColor` and `oceanConditionScore` do not exist.** The wind coloring is `windLevel()` (bands at 10/20/30 kt) plus theme tokens; there is no single "ocean condition score". The ocean grid shows raw values, the water-visibility estimate and the per-activity scores instead. Both were documented above under their real names.
3. **No source citations for thresholds.** The plan mentioned **INMET** and **Marinha do Brasil** as references for the alert thresholds. **Nothing in the code cites them**, and the alert thresholds were not derived from their published criteria: wind and sea limits were taken from the requirements given in the conversation, and the **rain (20/50/100 mm) and snow (5/15/30 mm) limits were chosen by the implementer and are unconfirmed**. Do not present them as official; if they should follow INMET or the Navy, the source values need to be provided and the functions/specs updated.
4. **Leftover component reference in `OceanGrid`.** The day header template still renders `<ActivityPanel>`, but no such component exists or is imported (activities moved into table rows with `ActivityCell` in commit `9edec9e`). Vue renders it as an unknown element; tests do not catch it. It is dead markup that should be removed (or the panel restored, if it was meant to stay).
5. **Inconsistent localStorage key naming.** Older keys use `st-*` (`st-theme`, `st-locale`, `st-scroll-sync`, `st-geo-asked`); newer ones use `storm-track:*`. Harmless, but worth unifying (with a migration) if desired.
6. **Internal names vs UI names.** "Water visibility" is still `clarity` in the code (`waterClarity.ts`, `ConditionBadge kind="clarity"`, `clarity-row`, i18n key `clarity`). Only the visible label was renamed.
7. **Stray code in the backend geocode route.** `routes/weather.py` keeps a string-literal leftover of an earlier Open-Meteo geocode call inside `geocode()`, and `schemas/weather.py` has a `GeocodeResponse` model that no route uses. The route returns raw Nominatim JSON, which is why the frontend accepts two shapes.
8. **`temperature_2m` hourly is requested but unused** by the UI, and per-hour `weather_code` is typed as "not sent by the backend yet" but the activity planner is already written to use it when it appears.
9. **Responsiveness and full-page AA have not been verified** beyond the token tests and class usage (see the section above).
10. **Heat alert depends on a backend change that is not in the repo yet.** The frontend reads `daily.apparent_temperature_max`, but `storm-tracker-backend/app/services/open_meteo.py` does not request it in the `daily` list, so the heat alert never appears until it is added.
11. **Roadmap items with no code:** push notifications and "Phase 2 — history with cache" have no implementation or stubs.
