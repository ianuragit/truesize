import { countryPhrase, formatPercentLarger, formatRatio } from './format';
import type { Country, Question } from '../types';

/**
 * Every number in these sentences comes from the generated dataset. Nothing
 * here is written per country, and no template placeholder is ever visible.
 */
export function explain(question: Question): string {
  const { a, b, answerIsBigger, trueRatio, mercatorRatio } = question;
  const bigger = answerIsBigger ? a : b;
  const smaller = answerIsBigger ? b : a;

  return `${truthSentence(bigger, smaller, trueRatio)} ${projectionSentence(
    smaller,
    trueRatio,
    mercatorRatio,
  )}`;
}

function truthSentence(bigger: Country, smaller: Country, trueRatio: number): string {
  const subject = countryPhrase(bigger, true);
  if (trueRatio >= 2) {
    return `${subject} is ${formatRatio(trueRatio)} times the size of ${countryPhrase(smaller)}.`;
  }
  return `${subject} is ${formatPercentLarger(trueRatio)} percent larger.`;
}

function projectionSentence(
  smallerCountry: Country,
  trueRatio: number,
  mercatorRatio: number,
): string {
  const smaller = countryPhrase(smallerCountry);
  // Mercator puts the smaller country on top.
  if (mercatorRatio < 1) {
    const flipped = 1 / mercatorRatio;
    if (flipped < 1.1) {
      return `On Mercator the two look near-identical, with ${smaller} marginally ahead — the projection flips the answer.`;
    }
    return `On Mercator, ${smaller} looks ${formatRatio(flipped)} times bigger — the projection flips the answer.`;
  }

  // Right order, but the margin is too small to see. Handled before the three
  // branches below so that no sentence ever has to say "1 to 1".
  if (mercatorRatio < 1.05) {
    return `Mercator points the right way, but barely: on screen the two come out very nearly the same size.`;
  }

  // Right order, wrong margin.
  if (mercatorRatio < trueRatio * 0.95) {
    return `Mercator points the right way, but narrows the gap to ${formatRatio(
      mercatorRatio,
    )} to 1.`;
  }

  if (mercatorRatio > trueRatio * 1.05) {
    return `Mercator agrees, then overdoes it, stretching the gap to ${formatRatio(
      mercatorRatio,
    )} to 1.`;
  }

  return `Mercator happens to get this pair about right, at ${formatRatio(mercatorRatio)} to 1.`;
}

/** One line under the final score. */
export function verdict(score: number): string {
  if (score === 100) return 'A perfect round. The projection did not fool you once.';
  if (score >= 80) return 'Strong. You are reading past the projection most of the time.';
  if (score >= 60) return 'Respectable, but Mercator still caught you out more than once.';
  if (score >= 40) return 'Roughly a coin flip — which is about what a Mercator map gives you.';
  if (score >= 20) return 'Mercator won this round. That is rather the point of it.';
  return 'Comprehensively fooled. Every one of those maps was lying to you.';
}
