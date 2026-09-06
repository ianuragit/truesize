import { verdict } from '../lib/explain';
import { articleFor, formatArea } from '../lib/format';
import { POINTS_PER_CORRECT, QUESTIONS_PER_ROUND } from '../lib/quiz';
import type { Answer, Question } from '../types';

interface FinalScoreProps {
  questions: Question[];
  answers: Answer[];
  score: number;
  onPlayAgain: () => void;
}

export function FinalScore({ questions, answers, score, onPlayAgain }: FinalScoreProps) {
  const correct = answers.filter((a) => a.correct).length;
  const maximum = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;

  return (
    <section className="final">
      <p className="final__label">Round complete</p>
      <p className="final__score">
        {score}
        <span className="final__outof"> / {maximum}</span>
      </p>
      <p className="final__verdict">{verdict(score)}</p>
      <p className="final__tally">
        {correct} of {QUESTIONS_PER_ROUND} right
      </p>

      <ol className="review">
        {questions.map((question, i) => {
          const answer = answers[i];
          const bigger = question.answerIsBigger ? question.a : question.b;
          const smaller = question.answerIsBigger ? question.b : question.a;
          return (
            <li key={`${question.a.iso3}-${question.b.iso3}`} className="review__row">
              <span
                className={
                  answer.correct ? 'review__mark review__mark--right' : 'review__mark review__mark--wrong'
                }
                aria-hidden="true"
              >
                {answer.correct ? '✓' : '✗'}
              </span>
              <span className="review__pair">
                <span className="review__names">
                  {articleFor(bigger, true)}
                  {bigger.name} <span className="review__beats">is bigger than</span>{' '}
                  {articleFor(smaller)}
                  {smaller.name}
                </span>
                <span className="review__areas">
                  {formatArea(bigger.trueAreaKm2)} vs {formatArea(smaller.trueAreaKm2)}
                </span>
              </span>
              <span className="review__sr">{answer.correct ? 'Correct' : 'Incorrect'}</span>
            </li>
          );
        })}
      </ol>

      <button type="button" className="button button--next final__again" onClick={onPlayAgain}>
        Play again
      </button>
    </section>
  );
}
