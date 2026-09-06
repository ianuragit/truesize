import { explain } from '../lib/explain';
import { POINTS_PER_CORRECT } from '../lib/quiz';
import type { Answer, ProjectionKind, Question } from '../types';

interface ResultPanelProps {
  question: Question;
  answer: Answer;
  projection: ProjectionKind;
  onToggleProjection: () => void;
  onNext: () => void;
  isLast: boolean;
}

export function ResultPanel({
  question,
  answer,
  projection,
  onToggleProjection,
  onNext,
  isLast,
}: ResultPanelProps) {
  const showingTruth = projection === 'equalEarth';

  return (
    <section
      className={answer.correct ? 'result result--correct' : 'result result--wrong'}
      aria-live="polite"
    >
      <p className="result__headline">
        {answer.correct ? 'Correct.' : 'Not quite.'}{' '}
        <span className={answer.correct ? 'result__points' : 'result__points result__points--zero'}>
          {answer.correct ? `+${POINTS_PER_CORRECT} points` : '+0 points'}
        </span>
      </p>
      <p className="result__explanation">{explain(question)}</p>
      <div className="result__actions">
        <button type="button" className="button button--ghost" onClick={onToggleProjection}>
          {showingTruth ? 'Back to Mercator' : 'Show me the true sizes'}
        </button>
        <button type="button" className="button button--next" onClick={onNext}>
          {isLast ? 'See your score' : 'Next country'}
        </button>
      </div>
      {showingTruth ? (
        <p className="result__note">
          Equal Earth keeps every country&rsquo;s area honest, at the cost of its shape. Same scale,
          same two countries.
        </p>
      ) : null}
    </section>
  );
}
