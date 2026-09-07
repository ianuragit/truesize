export type Bounds = [[number, number], [number, number]];

export interface Country {
  iso3: string;
  /** Numeric ISO 3166-1 code; matches the feature id in the world atlas. */
  id: string;
  name: string;
  trueAreaKm2: number;
  /**
   * How far the Natural Earth outline's own area is from `trueAreaKm2`, as a
   * fraction. The build fails past ±8%; kept here so the discrepancy is
   * visible rather than silent.
   */
  areaError: number;
  /** Spherical centroid, degrees. */
  lat: number;
  lon: number;
  /** Longitude the projection is rotated by, so nothing straddles ±180°. */
  rotateLon: number;
  /** Planar area under d3.geoMercator().scale(K), K shared by every country. */
  mercatorArea: number;
  /** Planar area under d3.geoEqualEarth().scale(K), same K. */
  equalEarthArea: number;
  /** mercatorArea / equalEarthArea, normalised so the equator reads 1.00. */
  inflation: number;
  /** Framing box at scale 1; multiply by a scale to get pixels. */
  mercatorBounds: Bounds;
  equalEarthBounds: Bounds;
}

export type ProjectionKind = 'mercator' | 'equalEarth';

/** Which way Mercator bends the comparison relative to the truth. */
export type Distortion = 'flip' | 'understate' | 'faithful' | 'exaggerate';

export interface Question {
  /** The country named first in "Is A bigger or smaller than B?". */
  a: Country;
  /** The country named second. */
  b: Country;
  /** True if A really is bigger than B. */
  answerIsBigger: boolean;
  /** Larger true area / smaller true area. Always >= 1. */
  trueRatio: number;
  /**
   * Mercator areas in the same order as trueRatio, so this drops below 1
   * exactly when the projection flips the answer.
   */
  mercatorRatio: number;
  distortion: Distortion;
}

export interface Answer {
  /** What the player clicked. */
  saidBigger: boolean;
  correct: boolean;
}
