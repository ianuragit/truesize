interface ProgressBarProps {
  /** Segments drawn dark: how many questions have been answered. */
  completed: number;
  /** The number shown on the right, before the slash. */
  current: number;
  total: number;
}

export function ProgressBar({ completed, current, total }: ProgressBarProps) {
  return (
    <div className="progress">
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label="Questions answered"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              i < completed ? 'progress__segment progress__segment--done' : 'progress__segment'
            }
          />
        ))}
      </div>
      <p className="progress__count">
        {current} / {total}
      </p>
    </div>
  );
}
