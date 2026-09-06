import { useEffect, useRef, useState } from 'react';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  downloadCard,
  drawScoreCard,
  fallbackText,
  shareResult,
} from '../lib/share';
import type { RoundResult, ShareOutcome } from '../lib/share';

const MESSAGE: Partial<Record<ShareOutcome, string>> = {
  copied: 'Copied to your clipboard.',
  failed: 'Copying was blocked — take the text below.',
};

interface ShareCardProps {
  result: RoundResult;
  /** The same line shown above the card, drawn into the image. */
  verdictLine: string;
}

export function ShareCard({ result, verdictLine }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!cancelled && canvas) drawScoreCard(canvas, result, verdictLine);
    };
    // Draw straight away so the card is never blank, then again once Poppins
    // has loaded, since the first pass would otherwise be set in a fallback.
    draw();
    void document.fonts?.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [result, verdictLine]);

  const withCanvas = async (action: (canvas: HTMLCanvasElement) => Promise<ShareOutcome>) => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    try {
      setOutcome(await action(canvas));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="share">
      <p className="share__label">Your score card</p>
      <div className="share__frame">
        <canvas
          ref={canvasRef}
          className="share__canvas"
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          role="img"
          aria-label={`Score card: ${result.score} out of 100`}
        />
      </div>

      <div className="share__actions">
        <button
          type="button"
          className="button button--next"
          disabled={busy}
          onClick={() => withCanvas((canvas) => shareResult(canvas, result))}
        >
          Share result
        </button>
        <button
          type="button"
          className="button button--ghost"
          disabled={busy}
          onClick={() =>
            withCanvas(async (canvas) =>
              (await downloadCard(canvas, result.score)) ? 'shared' : 'failed',
            )
          }
        >
          Save image
        </button>
      </div>

      {outcome && MESSAGE[outcome] ? (
        <p className="share__status" role="status">
          {MESSAGE[outcome]}
        </p>
      ) : null}

      {outcome === 'failed' ? (
        <textarea className="share__fallback" readOnly rows={7} value={fallbackText(result)} />
      ) : null}
    </section>
  );
}
