import { useEffect, useRef } from 'react';
import { runConfetti } from '../lib/confetti';

interface ConfettiProps {
  /** Drives how much confetti: a better round gets a bigger burst. */
  intensity: number;
}

export function Confetti({ intensity }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    return runConfetti(canvas, 90 + Math.round(intensity * 1.3));
  }, [intensity]);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}
