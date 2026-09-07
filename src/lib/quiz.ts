import data from '../data/countries.json';
import type { Country, Distortion, Question } from '../types';

// Through `unknown` because a JSON import widens the bounds tuples to
// number[][], which no longer overlaps the Bounds tuple type structurally.
export const COUNTRIES = data.countries as unknown as Country[];

export const QUESTIONS_PER_ROUND = 10;
export const POINTS_PER_CORRECT = 10;

/** Below this the two countries are effectively tied and the question is unfair. */
const MIN_TRUE_RATIO = 1.05;
/** Above this the answer is obvious however you draw it. */
const MAX_TRUE_RATIO = 3;
/** Degrees of latitude between the pair, so the projection has something to do. */
const MIN_LATITUDE_GAP = 12;
/** How much more one country must be inflated than the other. */
const MIN_INFLATION_GAP = 1.2;
/** Questions per round where Mercator actively misleads. */
const MIN_DECEPTIVE = 3;

type Pair = Omit<Question, 'a' | 'b' | 'answerIsBigger'> & {
  bigger: Country;
  smaller: Country;
  deceptive: boolean;
};

function classify(trueRatio: number, mercatorRatio: number): Distortion {
  if (mercatorRatio < 1) return 'flip';
  if (mercatorRatio < trueRatio * 0.95) return 'understate';
  if (mercatorRatio > trueRatio * 1.05) return 'exaggerate';
  return 'faithful';
}

function makePair(x: Country, y: Country): Pair {
  const bigger = x.trueAreaKm2 >= y.trueAreaKm2 ? x : y;
  const smaller = bigger === x ? y : x;
  const trueRatio = bigger.trueAreaKm2 / smaller.trueAreaKm2;
  // Measured in the same direction as the truth, so it drops below 1 exactly
  // when Mercator hands the win to the smaller country.
  const mercatorRatio = bigger.mercatorArea / smaller.mercatorArea;
  const distortion = classify(trueRatio, mercatorRatio);
  return {
    bigger,
    smaller,
    trueRatio,
    mercatorRatio,
    distortion,
    // Either the projection reverses the answer, or it closes at least half
    // the real gap — both leave the map arguing against the truth.
    deceptive: distortion === 'flip' || mercatorRatio <= 1 + (trueRatio - 1) / 2,
  };
}

function eligible(pair: Pair): boolean {
  const { bigger, smaller, trueRatio } = pair;
  if (trueRatio < MIN_TRUE_RATIO || trueRatio > MAX_TRUE_RATIO) return false;
  if (Math.abs(Math.abs(bigger.lat) - Math.abs(smaller.lat)) < MIN_LATITUDE_GAP) return false;
  const inflationGap =
    Math.max(bigger.inflation, smaller.inflation) / Math.min(bigger.inflation, smaller.inflation);
  return inflationGap >= MIN_INFLATION_GAP;
}

/** Every pair the quiz is allowed to ask about. Computed once. */
export const CANDIDATE_PAIRS: Pair[] = (() => {
  const pairs: Pair[] = [];
  for (let i = 0; i < COUNTRIES.length; i += 1) {
    for (let j = i + 1; j < COUNTRIES.length; j += 1) {
      const pair = makePair(COUNTRIES[i], COUNTRIES[j]);
      if (eligible(pair)) pairs.push(pair);
    }
  }
  return pairs;
})();

function shuffled<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toQuestion(pair: Pair): Question {
  // Randomise which country is named first, so "Bigger" is not the answer to
  // every question.
  const aIsBigger = Math.random() < 0.5;
  return {
    a: aIsBigger ? pair.bigger : pair.smaller,
    b: aIsBigger ? pair.smaller : pair.bigger,
    answerIsBigger: aIsBigger,
    trueRatio: pair.trueRatio,
    mercatorRatio: pair.mercatorRatio,
    distortion: pair.distortion,
  };
}

/**
 * Ten pairs, no country twice, at least MIN_DECEPTIVE of them cases where the
 * map argues against the truth.
 */
export function buildRound(): Question[] {
  const deceptive = CANDIDATE_PAIRS.filter((p) => p.deceptive);

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const used = new Set<string>();
    const chosen: Pair[] = [];

    const take = (pair: Pair): boolean => {
      if (used.has(pair.bigger.iso3) || used.has(pair.smaller.iso3)) return false;
      used.add(pair.bigger.iso3);
      used.add(pair.smaller.iso3);
      chosen.push(pair);
      return true;
    };

    for (const pair of shuffled(deceptive)) {
      if (chosen.length >= MIN_DECEPTIVE) break;
      take(pair);
    }
    if (chosen.length < MIN_DECEPTIVE) continue;

    for (const pair of shuffled(CANDIDATE_PAIRS)) {
      if (chosen.length >= QUESTIONS_PER_ROUND) break;
      take(pair);
    }
    if (chosen.length === QUESTIONS_PER_ROUND) return shuffled(chosen).map(toQuestion);
  }

  throw new Error('could not assemble a round from the country pool');
}
