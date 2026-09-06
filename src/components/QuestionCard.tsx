import { useMemo, useState } from 'react';
import { MapPanel } from './MapPanel';
import { ResultPanel } from './ResultPanel';
import { sharedScale } from '../lib/geo';
import { articleFor } from '../lib/format';
import type { Answer, ProjectionKind, Question } from '../types';

interface QuestionCardProps {
  question: Question;
  answer: Answer | null;
  onAnswer: (saidBigger: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

export function QuestionCard({ question, answer, onAnswer, onNext, isLast }: QuestionCardProps) {
  const [projection, setProjection] = useState<ProjectionKind>('mercator');
  const { a, b } = question;

  // One scale for both panels. This is the whole trick: fit the pair, never
  // each country on its own.
  const scale = useMemo(() => sharedScale(a, b, projection), [a, b, projection]);

  const buttonClass = (isBigger: boolean): string => {
    if (!answer) return 'button button--choice';
    if (answer.saidBigger !== isBigger) return 'button button--choice button--muted';
    return answer.correct
      ? 'button button--choice button--right'
      : 'button button--choice button--wrong';
  };

  return (
    <section className="question">
      <h2 className="question__prompt">
        Is {articleFor(a)}
        <span className="question__country">{a.name}</span> bigger or smaller than{' '}
        {articleFor(b)}
        <span className="question__country">{b.name}</span>?
      </h2>

      <div className="panels">
        <MapPanel country={a} kind={projection} scale={scale} revealed={answer !== null} />
        <div className="panels__divider" aria-hidden="true" />
        <MapPanel country={b} kind={projection} scale={scale} revealed={answer !== null} />
      </div>

      <div className="choices">
        <button
          type="button"
          className={buttonClass(true)}
          onClick={() => onAnswer(true)}
          disabled={answer !== null}
        >
          Bigger
        </button>
        <button
          type="button"
          className={buttonClass(false)}
          onClick={() => onAnswer(false)}
          disabled={answer !== null}
        >
          Smaller
        </button>
      </div>

      {answer ? (
        <ResultPanel
          question={question}
          answer={answer}
          projection={projection}
          onToggleProjection={() =>
            setProjection((current) => (current === 'mercator' ? 'equalEarth' : 'mercator'))
          }
          onNext={onNext}
          isLast={isLast}
        />
      ) : null}
    </section>
  );
}
