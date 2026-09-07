/**
 * A small canvas confetti burst. No dependency, no DOM beyond the canvas it is
 * handed, and it removes itself once every piece has fallen off screen.
 */

const COLORS = ['#2d6a55', '#c8963e', '#17313f', '#a8443a', '#c5dbcd', '#e0c58a'];

const GRAVITY = 0.32;
const DRAG = 0.994;
/** Frames a piece lives for before it has fully faded. */
const LIFE = 220;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  /** Advances independently of rotation so the piece appears to flutter. */
  flutter: number;
  flutterRate: number;
  width: number;
  height: number;
  color: string;
  life: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Two cannons, angled up and inwards from the bottom corners. */
function launch(width: number, height: number, count: number): Piece[] {
  // Enough upward speed to clear the viewport, whatever its height.
  const power = Math.sqrt(2 * GRAVITY * height) * 0.85;
  const pieces: Piece[] = [];

  for (let i = 0; i < count; i += 1) {
    const fromLeft = i % 2 === 0;
    const angle = fromLeft ? random(-1.35, -0.72) : random(-2.42, -1.79);
    const speed = power * random(0.72, 1.12);
    pieces.push({
      x: fromLeft ? width * 0.08 : width * 0.92,
      y: height * 1.02,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: random(0, Math.PI * 2),
      spin: random(-0.22, 0.22),
      flutter: random(0, Math.PI * 2),
      flutterRate: random(0.08, 0.18),
      width: random(7, 13),
      height: random(9, 17),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: LIFE * random(0.75, 1),
    });
  }
  return pieces;
}

/**
 * Starts the burst and returns a cancel function. Honours reduced-motion by
 * doing nothing at all.
 */
export function runConfetti(canvas: HTMLCanvasElement, count: number): () => void {
  const noop = () => {};
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return noop;

  const context = canvas.getContext('2d');
  if (!context) return noop;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);

  let pieces = launch(width, height, count);
  let frame = 0;

  const tick = () => {
    context.clearRect(0, 0, width, height);

    pieces = pieces.filter((piece) => {
      piece.vy += GRAVITY;
      piece.vx *= DRAG;
      piece.vy *= DRAG;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;
      piece.flutter += piece.flutterRate;
      piece.life -= 1;

      // Gone for good once it is below the fold on the way down.
      if (piece.life <= 0 || (piece.y - piece.height > height && piece.vy > 0)) return false;

      context.save();
      context.globalAlpha = Math.min(1, piece.life / (LIFE * 0.3));
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      // Squashing on one axis reads as a rectangle tumbling in three dimensions.
      context.scale(1, Math.cos(piece.flutter));
      context.fillStyle = piece.color;
      context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
      context.restore();
      return true;
    });

    if (pieces.length === 0) return;
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    context.clearRect(0, 0, width, height);
  };
}
