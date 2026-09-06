/**
 * Building and sharing the end-of-round score card: an emoji grid for plain
 * text, and a 1200x630 PNG drawn on a canvas for the platforms that want a
 * picture. Both are generated from the round the player actually played.
 */

import { PANEL_HEIGHT, PANEL_WIDTH, panelPaths, sharedScale } from './geo';
import { explain } from './explain';
import { formatInflation } from './format';
import { POINTS_PER_CORRECT, QUESTIONS_PER_ROUND } from './quiz';
import type { Answer, Country, Question } from '../types';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const MAXIMUM = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;
const TITLE = 'Guess the giant';

export interface RoundResult {
  questions: Question[];
  answers: Answer[];
  score: number;
}

/** How many of the round's pairs the projection actually reversed. */
export function flipCount(questions: Question[]): number {
  return questions.filter((q) => q.distortion === 'flip').length;
}

/** Two rows of five, so the grid stays readable in a tweet. */
export function emojiGrid(answers: Answer[]): string {
  const squares = answers.map((a) => (a.correct ? '🟩' : '🟥'));
  const rows: string[] = [];
  for (let i = 0; i < squares.length; i += 5) rows.push(squares.slice(i, i + 5).join(''));
  return rows.join('\n');
}

/** The page itself, without whatever query string or hash it was opened with. */
function pageUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

export function shareText({ questions, answers, score }: RoundResult): string {
  const flips = flipCount(questions);
  const flipLine =
    flips === 0
      ? 'Not one of my ten pairs was reversed by the projection.'
      : `Mercator flipped ${flips} of my ${QUESTIONS_PER_ROUND} pairs.`;
  return `${TITLE} ${score}/${MAXIMUM}\n\n${emojiGrid(answers)}\n\n${flipLine}`;
}

/** The pair where Mercator argued hardest against the truth. */
function mostDistorted(questions: Question[]): Question {
  return questions.reduce((worst, q) =>
    q.trueRatio / q.mercatorRatio > worst.trueRatio / worst.mercatorRatio ? q : worst,
  );
}

/* ------------------------------------------------------------------ drawing */

type Ctx = CanvasRenderingContext2D;

const INK = '#1a2b32';
const MUTED = '#6f7d84';
const FAINT = '#9aa5aa';
const AMBER = '#c8963e';
const LINE = '#d8d8d8';

const font = (weight: number, size: number) =>
  `${weight} ${size}px Poppins, "Segoe UI", system-ui, sans-serif`;

function roundedRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Letter-spaced small caps. Drawn a character at a time because canvas
 * letterSpacing is still too new to rely on.
 */
function drawTracked(ctx: Ctx, text: string, x: number, y: number, tracking: number): void {
  let cursor = x;
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + tracking;
  }
}

/** Wraps on spaces and returns the y position just past the last line. */
function drawWrapped(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  let line = '';
  let cursorY = y;
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      ctx.fillText(line, x, cursorY);
      cursorY += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

/** One country silhouette, drawn through the same projection the quiz uses. */
function drawSilhouette(
  ctx: Ctx,
  country: Country,
  scale: number,
  x: number,
  y: number,
  width: number,
): void {
  const paths = panelPaths(country, 'mercator', scale);
  const factor = width / PANEL_WIDTH;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(factor, factor);
  ctx.beginPath();
  ctx.rect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
  ctx.clip();

  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 1 / factor;
  ctx.stroke(new Path2D(paths.graticule));

  const outline = new Path2D(paths.country);
  ctx.fillStyle = '#c5dbcd';
  ctx.fill(outline);
  ctx.strokeStyle = '#2f5d4f';
  ctx.lineWidth = 1.6 / factor;
  ctx.lineJoin = 'round';
  ctx.stroke(outline);
  ctx.restore();
}

/**
 * Renders the shareable card into `canvas` at its full 1200x630 size.
 * Synchronous, so the caller controls when it runs — call it once up front and
 * again after `document.fonts.ready`, or the webfont may land mid-draw.
 */
export function drawScoreCard(
  canvas: HTMLCanvasElement,
  result: RoundResult,
  verdictLine: string,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = '#f7f5f1';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 32, 32, CARD_WIDTH - 64, CARD_HEIGHT - 64, 22);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const left = 88;
  const leftWidth = 532;
  const right = 660;
  const rightWidth = 452;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Masthead.
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 22);
  drawTracked(ctx, TITLE.toUpperCase(), left, 112, 3.4);

  // Score.
  ctx.fillStyle = INK;
  ctx.font = font(600, 126);
  ctx.fillText(String(result.score), left, 236);
  const scoreWidth = ctx.measureText(String(result.score)).width;
  ctx.fillStyle = FAINT;
  ctx.font = font(500, 40);
  ctx.fillText(` / ${MAXIMUM}`, left + scoreWidth, 236);

  // Verdict.
  ctx.fillStyle = INK;
  ctx.font = font(500, 32);
  drawWrapped(ctx, verdictLine, left, 296, leftWidth, 44);

  // One chip per question, in the order they were played.
  const chip = 40;
  const gap = 11;
  result.answers.forEach((answer, i) => {
    ctx.fillStyle = answer.correct ? '#2d6a55' : '#a8443a';
    roundedRect(ctx, left + i * (chip + gap), 430, chip, chip, 9);
    ctx.fill();
  });

  const flips = flipCount(result.questions);
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 22);
  ctx.fillText(
    flips === 0
      ? 'The projection reversed none of these ten pairs.'
      : `Mercator flipped ${flips} of these ${QUESTIONS_PER_ROUND} pairs.`,
    left,
    528,
  );

  ctx.fillStyle = FAINT;
  ctx.font = font(400, 20);
  // Bare host and path — no scheme, no trailing slash.
  ctx.fillText(pageUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''), left, 562);

  // The round's most misleading pair, at a single shared scale.
  const featured = mostDistorted(result.questions);
  const panelWidth = (rightWidth - 32) / 2;
  const scale = sharedScale(featured.a, featured.b, 'mercator');

  ctx.fillStyle = FAINT;
  ctx.font = font(600, 15);
  drawTracked(ctx, 'MERCATOR PROJECTION', right, 112, 2.2);

  const panelTop = 134;
  const panelHeight = (panelWidth / PANEL_WIDTH) * PANEL_HEIGHT;
  [featured.a, featured.b].forEach((country, i) => {
    const x = right + i * (panelWidth + 32);
    drawSilhouette(ctx, country, scale, x, panelTop, panelWidth);

    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = font(600, 21);
    ctx.fillText(country.name, x + panelWidth / 2, panelTop + panelHeight + 34);
    ctx.fillStyle = AMBER;
    ctx.font = font(500, 17);
    ctx.fillText(
      `${formatInflation(country.inflation)} inflation`,
      x + panelWidth / 2,
      panelTop + panelHeight + 58,
    );
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 19);
  drawWrapped(ctx, explain(featured), right, panelTop + panelHeight + 104, rightWidth, 28);
}

/* ------------------------------------------------------------------ sharing */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

const wasCancelled = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/** `Guess the giant 60 of 100.png` is friendlier in a camera roll than a hash. */
function fileName(score: number): string {
  return `guess-the-giant-${score}-of-${MAXIMUM}.png`;
}

export async function downloadCard(canvas: HTMLCanvasElement, score: number): Promise<boolean> {
  const blob = await toBlob(canvas);
  if (!blob) return false;

  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName(score);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  return true;
}

/**
 * Share sheet with the image where the browser supports it, share sheet with
 * the text where it does not, and the clipboard when there is no share sheet
 * at all. The caller shows the returned outcome.
 */
export async function shareResult(
  canvas: HTMLCanvasElement,
  result: RoundResult,
): Promise<ShareOutcome> {
  const text = shareText(result);
  const url = pageUrl();

  const blob = await toBlob(canvas);
  if (blob) {
    const file = new File([blob], fileName(result.score), { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: TITLE });
        return 'shared';
      } catch (error) {
        if (wasCancelled(error)) return 'cancelled';
        // Otherwise fall through and try without the image.
      }
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: TITLE, text, url });
      return 'shared';
    } catch (error) {
      if (wasCancelled(error)) return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Shown in a selectable box when the clipboard is unavailable. */
export function fallbackText(result: RoundResult): string {
  return `${shareText(result)}\n${pageUrl()}`;
}
