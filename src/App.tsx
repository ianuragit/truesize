import { useCallback, useState } from 'react';
import { FinalScore } from './components/FinalScore';
import { ProgressBar } from './components/ProgressBar';
import { QuestionCard } from './components/QuestionCard';
import { POINTS_PER_CORRECT, QUESTIONS_PER_ROUND, buildRound } from './lib/quiz';
import type { Answer, Question } from './types';

interface RoundState {
  questions: Question[];
  answers: Answer[];
  /** Index of the question on screen; equals QUESTIONS_PER_ROUND when finished. */
  index: number;
}

const newRound = (): RoundState => ({ questions: buildRound(), answers: [], index: 0 });

export default function App() {
  const [round, setRound] = useState<RoundState>(newRound);
  const { questions, answers, index } = round;

  const finished = index >= QUESTIONS_PER_ROUND;
  const score = answers.filter((a) => a.correct).length * POINTS_PER_CORRECT;
  // The answer for the question on screen, if it has been given already.
  const currentAnswer = answers[index] ?? null;

  const handleAnswer = useCallback((saidBigger: boolean) => {
    setRound((state) => {
      if (state.answers[state.index]) return state;
      const question = state.questions[state.index];
      const answer: Answer = { saidBigger, correct: saidBigger === question.answerIsBigger };
      return { ...state, answers: [...state.answers, answer] };
    });
  }, []);

  const handleNext = useCallback(() => {
    setRound((state) => ({ ...state, index: state.index + 1 }));
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__titles">
          <h1 className="masthead__title">Guess the giant</h1>
          <p className="masthead__tagline">
            Ten countries, drawn the way Mercator draws them. Trust the map at your peril.
          </p>
        </div>
        <div className="masthead__score">
          <span className="masthead__number">{score}</span>
          <span className="masthead__unit">points</span>
        </div>
      </header>

      <ProgressBar
        completed={answers.length}
        current={Math.min(index + 1, QUESTIONS_PER_ROUND)}
        total={QUESTIONS_PER_ROUND}
      />

      <main className="stage">
        {finished ? (
          <FinalScore
            questions={questions}
            answers={answers}
            score={score}
            onPlayAgain={() => setRound(newRound())}
          />
        ) : (
          <QuestionCard
            key={index}
            question={questions[index]}
            answer={currentAnswer}
            onAnswer={handleAnswer}
            onNext={handleNext}
            isLast={index === QUESTIONS_PER_ROUND - 1}
          />
        )}
      </main>

      <footer className="colophon">
        <p>
          Areas from the CIA World Factbook. Outlines from Natural Earth via world-atlas, projected
          in the browser with d3-geo. Both countries in a pair are always drawn at the same scale.
        </p>
      </footer>
    </div>
  );
}
