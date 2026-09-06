import { geoEqualEarth, geoGraticule, geoMercator, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import topology from '../data/world-110m.json';
import type { Bounds, Country, ProjectionKind } from '../types';

/** The panel's SVG user-space size. Every projection below works in these units. */
export const PANEL_WIDTH = 320;
export const PANEL_HEIGHT = 260;

/** Leaves a margin so the bigger country of a pair does not touch the frame. */
const FIT_PADDING = 0.84;

const world = feature(
  topology as unknown as Topology,
  (topology as unknown as Topology).objects.countries as GeometryCollection,
) as FeatureCollection<Geometry>;

const featuresById = new Map(world.features.map((f) => [String(f.id), f]));

export function featureFor(country: Country): Feature<Geometry> {
  const f = featuresById.get(country.id);
  if (!f) throw new Error(`no geometry for ${country.name} (id ${country.id})`);
  return f;
}

const DEGREES = 180 / Math.PI;

/** Graticule spacings we are willing to draw, coarsest first. */
const GRATICULE_STEPS = [30, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
/** Roughly how far apart grid lines should sit on screen, in panel units. */
const GRATICULE_SPACING = 72;

/**
 * A fixed 10° grid would be invisible on a pair of small countries (the lines
 * fall outside the panel) and a dense hatch on a pair of continents. Pick the
 * spacing that puts a handful of lines across the panel at this scale.
 */
function graticuleStep(scale: number): number {
  const ideal = (GRATICULE_SPACING / scale) * DEGREES;
  return GRATICULE_STEPS.reduce((best, step) =>
    Math.abs(Math.log(step / ideal)) < Math.abs(Math.log(best / ideal)) ? step : best,
  );
}

/**
 * The grid, generated only for the window the panel can actually show. The
 * radii are the full panel dimensions rather than half, which over-covers by
 * about a factor of two — cheap insurance against the latitude stretch.
 */
function graticuleFor(projection: GeoProjection, scale: number, country: Country) {
  const step = graticuleStep(scale);
  const centre = projection.invert?.([PANEL_WIDTH / 2, PANEL_HEIGHT / 2]) ?? [
    country.lon,
    country.lat,
  ];
  const lonRadius = Math.min(180, (PANEL_WIDTH / scale) * DEGREES);
  const latRadius = Math.min(90, (PANEL_HEIGHT / scale) * DEGREES);
  return geoGraticule()
    .step([step, step])
    .extent([
      [centre[0] - lonRadius, Math.max(-89, centre[1] - latRadius)],
      [centre[0] + lonRadius, Math.min(89, centre[1] + latRadius)],
    ]);
}

function boundsFor(country: Country, kind: ProjectionKind): Bounds {
  return kind === 'mercator' ? country.mercatorBounds : country.equalEarthBounds;
}

/** The largest scale at which `bounds` still fits inside one panel. */
function fitScale(bounds: Bounds): number {
  const width = bounds[1][0] - bounds[0][0];
  const height = bounds[1][1] - bounds[0][1];
  return Math.min(PANEL_WIDTH / width, PANEL_HEIGHT / height);
}

/**
 * The single scale both countries of a pair are drawn at — the more
 * restrictive of the two fits, so the larger country fills its panel and the
 * smaller one is left genuinely smaller. Fitting each country to its own box
 * independently would erase the entire point of the quiz.
 */
export function sharedScale(a: Country, b: Country, kind: ProjectionKind): number {
  return Math.min(fitScale(boundsFor(a, kind)), fitScale(boundsFor(b, kind))) * FIT_PADDING;
}

/**
 * The shared projection, translated so this country sits in the middle of its
 * own panel. The rotation is by longitude only: in Mercator that is exactly a
 * horizontal shift (so the scale really is shared), and Equal Earth is
 * equal-area under any rotation, so neither projection's areas move.
 */
export function projectionFor(
  country: Country,
  kind: ProjectionKind,
  scale: number,
): GeoProjection {
  const projection = kind === 'mercator' ? geoMercator() : geoEqualEarth();
  projection.scale(scale).rotate([-country.rotateLon, 0, 0]).translate([0, 0]);

  const bounds = boundsFor(country, kind);
  const centreX = ((bounds[0][0] + bounds[1][0]) / 2) * scale;
  const centreY = ((bounds[0][1] + bounds[1][1]) / 2) * scale;
  return projection.translate([PANEL_WIDTH / 2 - centreX, PANEL_HEIGHT / 2 - centreY]);
}

export interface PanelPaths {
  country: string;
  graticule: string;
}

export function panelPaths(
  country: Country,
  kind: ProjectionKind,
  scale: number,
): PanelPaths {
  const projection = projectionFor(country, kind, scale);
  const path = geoPath(projection);
  return {
    country: path(featureFor(country)) ?? '',
    graticule: path(graticuleFor(projection, scale, country)()) ?? '',
  };
}
