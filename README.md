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

From a pool of 75 countries spanning every latitude, a pair is eligible when the
true areas differ by 5–200%, the two countries sit at least 12° of latitude
apart, and one is inflated at least 1.2× more than the other. That yields ~758
pairs, of which ~240 are outright reversals. Each round takes ten of them, no
country twice, with at least three where the map argues against the truth.

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
                          format, share (score card), confetti
src/data/                 generated: countries.json, world-110m.json
```

## Data notes

Areas are total area (land plus inland water) from the CIA World Factbook.
Outlines are Natural Earth 1:110m via [world-atlas][], matched by numeric ISO
3166-1 code.

Three deliberate omissions keep what is drawn and what is measured the same
country:

- **France** and **Norway** — their Natural Earth outlines include territory
  (the overseas departments; Svalbard) that the quoted area excludes.
- **Anything below ~145,000 km²** — at 1:110m, a country that small becomes an
  unrecognisable polygon once a pair of them is scaled up to fill a panel.

[world-atlas]: https://github.com/topojson/world-atlas
