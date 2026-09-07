/**
 * The "games played" tally.
 *
 * There is no server and no database, so this counts games played in *this
 * browser* rather than across everyone. A fresh browser is seeded somewhere
 * between 200 and 300 so the counter does not open at zero.
 */

const STORAGE_KEY = 'guess-the-giant:games-played';
const SEED_MIN = 200;
const SEED_MAX = 300;

/** Holds the count when localStorage throws — private windows, blocked storage. */
let current: number | null = null;

const seed = (): number => SEED_MIN + Math.floor(Math.random() * (SEED_MAX - SEED_MIN + 1));

function readStored(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    // Anything hand-edited or corrupt is treated as absent and reseeded.
    return Number.isInteger(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStored(value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage is unavailable; `current` still keeps the number stable for
    // the rest of this session.
  }
}

/** The count to display, seeding this browser on first visit. */
export function gamesPlayed(): number {
  if (current === null) {
    const stored = readStored();
    current = stored ?? seed();
    if (stored === null) writeStored(current);
  }
  return current;
}

/**
 * Counts one game. Called when the first question of a round is answered, not
 * when the round is finished — an abandoned round still counts as played.
 */
export function recordGamePlayed(): number {
  current = gamesPlayed() + 1;
  writeStored(current);
  return current;
}
