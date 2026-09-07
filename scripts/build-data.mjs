/**
 * Build-time data generation for "Guess the giant".
 *
 * Reads two committed inputs:
 *   - data/country-areas.json  (curated pool + real areas, hand-maintained)
 *   - node_modules/world-atlas/countries-110m.json  (geometry, bundled locally)
 *
 * Writes two generated outputs into src/data/:
 *   - world-110m.json  a copy of the TopoJSON so the app never touches a CDN
 *   - countries.json   per-country projected metrics used by the quiz
 *
 * Nothing here hits the network.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoPath, geoMercator, geoEqualEarth, geoCentroid, geoArea } from 'd3-geo';
import { feature } from 'topojson-client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

/** Shared projection scale, K. Every country is measured through the same K. */
const K = 500;

/**
 * Bounds are stored at scale 1 (i.e. divided by REF_SCALE) so the runtime can
 * multiply by whatever pair scale it picks. They are measured at REF_SCALE
 * rather than at 1 so that d3's adaptive resampling curves the parallels the
 * same way it will on screen.
 */
const REF_SCALE = 500;

/** Keep the biggest polygons that together make up this share of a country. */
const COVERAGE = 0.9;
/** ...and never keep a polygon smaller than this share of the whole. */
const MIN_SHARE = 0.01;

/** Mean Earth radius, for turning steradians into square kilometres. */
const EARTH_RADIUS_KM = 6371.0088;

/**
 * How far a country's outline may disagree with its quoted area.
 *
 * These are independent sources — Natural Earth's polygon and the Factbook's
 * figure — and they part company whenever the two disagree about disputed
 * territory (Western Sahara, Somaliland, Kashmir, Crimea) or about whether
 * inland water counts. That matters because the Equal Earth panel is the
 * quiz's proof: it draws areas straight from the outline, and is supposed to
 * confirm the areas printed under it. A country whose outline is a third too
 * big would have that panel contradict its own caption.
 *
 * Simplification at 1:110m alone costs a few per cent, so the tolerance sits
 * above that and below the point where a viewer could see the difference.
 */
const AREA_TOLERANCE = 0.08;

const src = JSON.parse(readFileSync(resolve(root, 'data/country-areas.json'), 'utf8'));
const atlasPath = resolve(root, 'node_modules/world-atlas/countries-110m.json');
const topology = JSON.parse(readFileSync(atlasPath, 'utf8'));

const world = feature(topology, topology.objects.countries);
const byId = new Map(world.features.map((f) => [String(f.id), f]));

/** Wrap a longitude into (-180, 180]. */
const wrapLon = (lon) => {
  let l = lon;
  while (l > 180) l -= 360;
  while (l <= -180) l += 360;
  return l;
};

/** A projection centred on `rotateLon`, so nothing straddles the antimeridian. */
function project(kind, rotateLon, scale) {
  const proj = kind === 'mercator' ? geoMercator() : geoEqualEarth();
  return proj.scale(scale).rotate([-rotateLon, 0, 0]).translate([0, 0]);
}

/** Every polygon of a feature, as its own single-polygon feature. */
function polygonsOf(f) {
  const g = f.geometry;
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  throw new Error(`unexpected geometry ${g.type} for ${f.properties?.name}`);
}

const asFeature = (coords) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'Polygon', coordinates: coords },
});

/**
 * The mainland silhouette: the largest polygons covering COVERAGE of the
 * country's projected area. Used only for framing, so that a scatter of
 * far-flung islands (the Galapagos, Hawaii) does not pull the country
 * off-centre or shrink it to a speck. All polygons are still drawn.
 */
function mainlandBounds(f, kind, rotateLon) {
  const path = geoPath(project(kind, rotateLon, REF_SCALE));
  const polys = polygonsOf(f)
    .map((coords) => {
      const pf = asFeature(coords);
      return { pf, area: Math.abs(path.area(pf)) };
    })
    .sort((a, b) => b.area - a.area);

  const total = polys.reduce((sum, p) => sum + p.area, 0);
  const keep = [];
  let covered = 0;
  for (const p of polys) {
    if (keep.length > 0 && (covered / total >= COVERAGE || p.area / total < MIN_SHARE)) break;
    keep.push(p);
    covered += p.area;
  }

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of keep) {
    const [[a, b], [c, d]] = path.bounds(p.pf);
    x0 = Math.min(x0, a);
    y0 = Math.min(y0, b);
    x1 = Math.max(x1, c);
    y1 = Math.max(y1, d);
  }
  return [
    [x0 / REF_SCALE, y0 / REF_SCALE],
    [x1 / REF_SCALE, y1 / REF_SCALE],
  ];
}

/**
 * Mercator inflates by sec(lat)^2 and Equal Earth does not inflate at all, but
 * the two projections do not agree on the size of an equatorial patch either.
 * Measuring one small square on the equator gives the constant that divides
 * that difference out, so `inflation` reads as 1.00 at the equator.
 */
function equatorialBaseline() {
  // Wound clockwise: d3-geo reads a counter-clockwise ring as the whole sphere
  // minus the patch, which would silently give a baseline of pi.
  const patch = asFeature([
    [
      [-1, -1],
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ],
  ]);
  const merc = Math.abs(geoPath(project('mercator', 0, K)).area(patch));
  const eq = Math.abs(geoPath(project('equalEarth', 0, K)).area(patch));
  return merc / eq;
}

const BASELINE = equatorialBaseline();

const countries = src.countries.map((c) => {
  const f = byId.get(c.id);
  if (!f) throw new Error(`no geometry for ${c.name} (id ${c.id})`);

  const centroid = geoCentroid(f);
  const rotateLon = wrapLon(centroid[0]);

  const mercatorArea = Math.abs(geoPath(project('mercator', rotateLon, K)).area(f));
  const equalEarthArea = Math.abs(geoPath(project('equalEarth', rotateLon, K)).area(f));

  // How far this outline is from the area printed under it. See AREA_TOLERANCE.
  const outlineKm2 = geoArea(f) * EARTH_RADIUS_KM * EARTH_RADIUS_KM;
  const areaError = outlineKm2 / c.trueAreaKm2 - 1;

  return {
    iso3: c.iso3,
    id: c.id,
    name: c.name,
    trueAreaKm2: c.trueAreaKm2,
    areaError: Number(areaError.toFixed(4)),
    lat: Number(centroid[1].toFixed(3)),
    lon: Number(centroid[0].toFixed(3)),
    rotateLon: Number(rotateLon.toFixed(3)),
    mercatorArea: Number(mercatorArea.toFixed(3)),
    equalEarthArea: Number(equalEarthArea.toFixed(3)),
    inflation: Number((mercatorArea / equalEarthArea / BASELINE).toFixed(4)),
    mercatorBounds: mainlandBounds(f, 'mercator', rotateLon),
    equalEarthBounds: mainlandBounds(f, 'equalEarth', rotateLon),
  };
});

const asPercent = (error) => `${error >= 0 ? '+' : ''}${(error * 100).toFixed(1)}%`;

// Fail the build rather than ship a country whose Equal Earth panel would
// argue with the area printed under it.
const mismatched = countries.filter((c) => Math.abs(c.areaError) > AREA_TOLERANCE);
if (mismatched.length > 0) {
  const detail = mismatched
    .map((c) => `  ${c.name} (${c.iso3}): outline is ${asPercent(c.areaError)} of its quoted area`)
    .join('\n');
  throw new Error(
    `${mismatched.length} country outline(s) disagree with data/country-areas.json by more ` +
      `than ${(AREA_TOLERANCE * 100).toFixed(0)}%:\n${detail}\n` +
      'Either the quoted area is wrong, or Natural Earth draws different territory. ' +
      'Correct the figure or drop the country from the pool.',
  );
}

const outDir = resolve(root, 'src/data');
mkdirSync(outDir, { recursive: true });

copyFileSync(atlasPath, resolve(outDir, 'world-110m.json'));
writeFileSync(
  resolve(outDir, 'countries.json'),
  `${JSON.stringify({ scale: K, source: src.source, countries }, null, 1)}\n`,
);

const sorted = [...countries].sort((a, b) => a.inflation - b.inflation);
const worstArea = countries.reduce((w, c) => (Math.abs(c.areaError) > Math.abs(w.areaError) ? c : w));
console.log(`build-data: ${countries.length} countries -> src/data/countries.json`);
console.log(`build-data: equatorial baseline ${BASELINE.toFixed(6)}`);
console.log(
  `build-data: outlines within ±${(AREA_TOLERANCE * 100).toFixed(0)}% of quoted area ` +
    `(worst: ${worstArea.name} ${asPercent(worstArea.areaError)})`,
);
console.log(
  `build-data: inflation ranges ${sorted[0].name} ${sorted[0].inflation.toFixed(2)}x ` +
    `to ${sorted[sorted.length - 1].name} ${sorted[sorted.length - 1].inflation.toFixed(2)}x`,
);
