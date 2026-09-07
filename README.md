# Guess the giant

A ten-question quiz about the Mercator projection. It shows you two countries
side by side, drawn in Mercator, and asks which is bigger. Then it tells you the
truth, and how much the projection had to distort to make you believe otherwise.

Mercator inflates land far from the equator by roughly `sec²(latitude)`.
Greenland comes out about **16.5×** larger than it should be; Gabon, sitting on
the equator, comes out exactly right. Put those two habits of the projection
next to each other and most people's intuition falls apart.

## How it works

**Both countries in a pair are always drawn at the same scale.** This is the
only thing that matters. A quiz that fitted each country to its own box would
show every pair at roughly the same size and would be measuring nothing. So one
`d3.geoMercator()` scale is computed for the pair — the more restrictive of the
two fits — and each panel then only *translates* to centre its own country.

The projection is rotated by longitude so that no country straddles the
antimeridian (Russia would otherwise be sliced in half). In Mercator a
longitude rotation is exactly a horizontal shift, so the shared scale really is
shared; Equal Earth is equal-area under any rotation, so its areas hold too.

A faint graticule sits behind each country. It is the visual tell: on Mercator
it is a plain rectangular grid that quietly stretches as you go north, and on
Equal Earth the meridians visibly bend.

### The numbers

`scripts/build-data.mjs` runs before every build and writes `src/data/`:

| field | how it is computed |
| --- | --- |
| `trueAreaKm2` | looked up in `data/country-areas.json`, a committed static dataset |
| `mercatorArea` | `d3.geoPath(d3.geoMercator().scale(K)).area(feature)` |
| `equalEarthArea` | the same, with `d3.geoEqualEarth().scale(K)` |
| `inflation` | `mercatorArea / equalEarthArea`, normalised against a small patch measured on the equator so a country there reads `1.00` |

`K` is one fixed scale shared by every country, so the areas are comparable
across the whole pool. Nothing is fetched at build time or at runtime — the
world-atlas TopoJSON is copied into `src/data/` and bundled.

At runtime the quiz derives `trueRatio` (larger true area over smaller) and
`mercatorRatio` (the same two countries' Mercator areas, *in the same order*,
so the value drops below 1 exactly when the projection reverses the answer).
The explanation text branches on those two numbers alone — see
`src/lib/explain.ts`. No sentence is written per country.

### Games played

A tally sits under the masthead and again beside the final tally. It counts a
game from the moment its **first question is answered**, so a round someone
abandons halfway still counts.

It is **per browser, not global**. There is no server-side state in this app —
`src/lib/gamesPlayed.ts` keeps the number in `localStorage`, seeded once per
browser at a random value between 200 and 300 so it does not open at zero. Two
people therefore see two different numbers, and clearing site data resets one of
them. Making it a true site-wide total would mean giving `server.js` somewhere
to persist a count; see *A real shared counter* below.

Where storage is unavailable — a private window, blocked cookies — every read
and write is caught and the count falls back to memory, so it still seeds and
still increments for the length of the session.

#### A real shared counter

If the number should be everybody's rather than each visitor's, the smallest
honest version is two routes on the existing Express server (`GET /api/plays`,
`POST /api/plays`) over a single integer. Railway's filesystem is ephemeral, so
a JSON file on disk resets on every deploy; a Railway Postgres or Redis add-on,
or any hosted key-value store, would hold it properly. That is a real change in
kind — the app currently has no backend state at all — so it is deliberately not
done here.

### The end of a round

Finishing a round fires a short canvas confetti burst (`src/lib/confetti.ts`,
no dependency, sized by your score, silent under `prefers-reduced-motion`) and
builds a score card you can post.

The card is drawn on a canvas at 1200×630 — the shape timelines want — and
includes the round's *most misleading pair*, drawn through the same shared-scale
Mercator projection the quiz uses, with the same generated explanation
underneath. **Share result** hands the browser a PNG through the Web Share API
where that is supported, falls back to a text share, and failing that copies the
text to the clipboard. **Save image** downloads the PNG.

The text share is a Wordle-style grid built from the actual round:

```
Guess the giant 60/100

🟩🟥🟩🟩🟥
🟩🟩🟥🟩🟩

Mercator flipped 4 of my 10 pairs.
```

### Choosing the questions

From a pool of 84 countries spanning every latitude, a pair is eligible when the
true areas differ by 5–200%, the two countries sit at least 12° of latitude
apart, and one is inflated at least 1.2× more than the other. That yields 942
pairs, of which 286 are outright reversals. Each round takes ten of them, no
country twice, with at least three where the map argues against the truth.

**Every round is reshuffled.** `buildRound()` runs on load and again on *Play
again*, and randomises four separate things: which deceptive pairs open the
round, which pairs fill it out, the order they are asked in, and which country
of each pair is named first (so "Bigger" is not always the answer). Over 500
simulated rounds, 755 of the 942 eligible pairs turned up and no two rounds
matched. Nothing is seeded, so there is no daily puzzle shared between players —
two people opening the link get different questions.

### Adding a country

Add a row to `data/country-areas.json` — `iso3`, `id` (the numeric ISO 3166-1
code, which is the feature id in the atlas), `name`, `trueAreaKm2` — and run
`npm run data`. Two rules are enforced for you:

- **The outline must match the area.** The build measures each country's
  geodesic area from its own outline and fails if it is more than 8% from the
  quoted figure. Natural Earth and the Factbook disagree wherever they disagree
  about disputed territory or inland water, and the Equal Earth panel draws its
  areas from the outline — so a country that fails this check would have that
  panel contradict the number printed beneath it.
- **Nothing under ~145,000 km².** At 1:110m a country that small is drawn as an
  unrecognisable polygon once a pair of them is scaled up to fill a panel.

## Local development

```sh
npm install
npm run dev          # regenerates src/data/, then serves on http://localhost:5173
```

Other scripts:

```sh
npm run data         # regenerate src/data/ only
npm run build        # build data + production bundle into dist/
npm start            # serve dist/ on $PORT (default 3000)
npm run typecheck    # tsc --noEmit
```

To check the production build the way Railway will run it:

```sh
npm run build && PORT=4321 npm start
```

## Deploying to Railway

No environment variables, no database, no add-ons.

1. Push this repository to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo**, and pick it.
3. Leave the build and start commands alone. Nixpacks reads `package.json` and
   runs `npm run build`, then `npm start`. `engines.node` pins Node 20+.
4. Under **Settings → Networking**, click **Generate Domain**.
5. Open the domain. `railway.json` sets the healthcheck path to `/`, which the
   server answers with `index.html`.

The server binds `0.0.0.0` rather than `localhost` — a container-local bind
fails Railway's healthcheck — and listens on `process.env.PORT`.

## Layout

```
data/country-areas.json   committed static dataset: pool + real areas
scripts/build-data.mjs    build-time projection maths -> src/data/
server.js                 Express, serves dist/ on $PORT
src/components/           MapPanel, QuestionCard, ResultPanel, ProgressBar,
                          FinalScore, ShareCard, Confetti
src/lib/                  geo (projections), quiz (pair selection), explain,
                          format, share (score card), confetti, gamesPlayed
src/data/                 generated: countries.json, world-110m.json
```

## Data notes

Areas are total area (land plus inland water) from the CIA World Factbook.
Outlines are Natural Earth 1:110m via [world-atlas][], matched by numeric ISO
3166-1 code.

The two are independent sources and they do not always agree, so the build
enforces the ±8% check described under *Adding a country*. That rule, plus the
~145,000 km² floor, is what keeps these out of the pool:

| excluded | outline vs quoted area | why |
| --- | --- | --- |
| Morocco | +33% | Natural Earth's outline takes in Western Sahara |
| Somalia | −24% | Somaliland is a separate outline in the atlas |
| Yemen | −13% | |
| Ecuador | −11% | the Galápagos are in the Factbook figure, not the outline |
| Suriname | −12% | |
| Saudi Arabia | −10% | |
| Pakistan | +10% | the outline includes Pakistan-administered Kashmir |
| Bangladesh | −10% | the Factbook figure counts a lot of river |
| France, Norway | — | outlines include the overseas departments; Svalbard |

Of the countries that remain, Chile is the furthest out at +7.7%, which is
within simplification noise at this resolution.

[world-atlas]: https://github.com/topojson/world-atlas
