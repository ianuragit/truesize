/** Number and name formatting shared by the map panels and the explanation text. */

import type { Country } from '../types';

const groups = new Intl.NumberFormat('en-US');

/**
 * Countries that read as "the ..." mid-sentence. Labels under a map stay bare
 * ("United Kingdom"); only running prose takes the article.
 */
const DEFINITE_ARTICLE = new Set(['USA', 'GBR', 'PHL']);

/** `'the '`, `'The '` or `''` — kept separate so the name can be styled alone. */
export function articleFor(country: Country, sentenceStart = false): string {
  if (!DEFINITE_ARTICLE.has(country.iso3)) return '';
  return sentenceStart ? 'The ' : 'the ';
}

/** The name as it should appear in a sentence. */
export function countryPhrase(country: Country, sentenceStart = false): string {
  return `${articleFor(country, sentenceStart)}${country.name}`;
}

/** `1,221,037 sq km` */
export function formatArea(km2: number): string {
  return `${groups.format(Math.round(km2))} sq km`;
}

/**
 * A ratio as people say it out loud: `1.1`, `2.4`, `17`. Drops the decimal
 * once the number is big enough that the tenth stops carrying information.
 */
export function formatRatio(ratio: number): string {
  if (ratio >= 10) return String(Math.round(ratio));
  // "2 times the size of" rather than "2.0 times the size of".
  return ratio.toFixed(1).replace(/\.0$/, '');
}

/** `57` for a ratio of 1.57. */
export function formatPercentLarger(ratio: number): string {
  return String(Math.round((ratio - 1) * 100));
}

/** `2.9x` — the inflation badge under a country's name. */
export function formatInflation(inflation: number): string {
  return `${inflation < 10 ? inflation.toFixed(1) : String(Math.round(inflation))}x`;
}
