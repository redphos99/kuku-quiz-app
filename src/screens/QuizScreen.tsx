import { useEffect, useRef, useState } from 'react';
import type { AnswerLog, Question, QuizSettings } from '../types';
import { formatClock, generateQuestions } from '../quiz';
import { Numpad } from '../components/Numpad';

export interface QuizResult {
  answers: AnswerLog[];
  durationMs: number;
}

interface QuizScreenProps {
  settings: QuizSettings;
  /** 指定すると、設定から作る代わりにこの問題をこの順で出題する（まちがえ直し用） */
  questions?: Question[];
  onFinish: (result: QuizResult) => void;
  onQuit: () => void;
}

const MAX_DIGITS = 2; // 九九の答えは最大 81
const AUTO_ADVANCE_MS = 900;
/** 連打で正誤の表示を飛ばしてしまわないための猶予 */
const ADVANCE_GUARD_MS = 350;

export function QuizScreen({ settings, questions: fixedQuestions, onFinish, onQuit }: QuizScreenProps) {
  const [questions] = useState(() => fixedQuestions ?? generateQuestions(settings));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<AnswerLog[]>([]);
  const [feedback, setFeedback] = useState<AnswerLog | null>(null);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startedAt = useRef(Date.now());
  const questionShownAt = useRef(Date.now());
  const submittedAt = useRef(0);
  const endedAt = useRef<number | null>(null);

  const question = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const answering = feedback === null;

  useEffect(() => {
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => window.clearInterval(id);
  }, []);

  const addDigit = (digit: number) => {
    if (!answering) return;
    setInput((prev) => {
      if (prev === '0') return String(digit);
      return prev.length >= MAX_DIGITS ? prev : prev + digit;
    });
  };

  const deleteDigit = () => {
    if (!answering) return;
    setInput((prev) => prev.slice(0, -1));
  };

  const submit = () => {
    if (!answering || input === '') return;
    const now = Date.now();
    const userAnswer = Number(input);
    const log: AnswerLog = {
      dan: question.dan,
      multiplier: question.multiplier,
      userAnswer,
      correct: userAnswer === question.dan * question.multiplier,
      seconds: Math.round(((now - questionShownAt.current) / 1000) * 10) / 10,
    };
    submittedAt.current = now;
    if (isLast) endedAt.current = now;
    setAnswers((prev) => [...prev, log]);
    setFeedback(log);
  };

  const advance = () => {
    if (answering) return;
    if (isLast) {
      onFinish({
        answers,
        durationMs: (endedAt.current ?? Date.now()) - startedAt.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setInput('');
    setFeedback(null);
    questionShownAt.current = Date.now();
  };

  // 物理キーボード・自動送りのハンドラは常に最新の state を参照させる
  const latest = useRef({ addDigit, deleteDigit, submit, advance });
  latest.current = { addDigit, deleteDigit, submit, advance };

  const tryAdvance = () => {
    if (Date.now() - submittedAt.current >= ADVANCE_GUARD_MS) advance();
  };

  // 正解のときは少し待って自動で次へ。まちがいのときは自分のタイミングで次へ
  useEffect(() => {
    if (!feedback?.correct) return;
    const id = window.setTimeout(() => latest.current.advance(), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (confirmingQuit || e.ctrlKey || e.metaKey || e.altKey) return;
      const { addDigit, deleteDigit, submit, advance } = latest.current;
      if (/^[0-9]$/.test(e.key)) {
        addDigit(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteDigit();
      } else if (e.key === 'Enter') {
        // ボタンにフォーカスがあっても二重に反応しないよう、既定動作は止める
        e.preventDefault();
        if (e.repeat) return;
        if (input !== '' && feedback === null) submit();
        else if (feedback !== null && Date.now() - submittedAt.current >= ADVANCE_GUARD_MS) advance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmingQuit, input, feedback]);

  const correctAnswer = question.dan * question.multiplier;
  const progress = ((index + (answering ? 0 : 1)) / total) * 100;

  return (
    <main className="screen quiz">
      <header className="quiz-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmingQuit(true)}>
          やめる
        </button>
        <div className="quiz-progress-text" aria-live="polite">
          <strong>{index + 1}</strong> / {total}もん
        </div>
        <div className="quiz-clock" aria-label="けいかじかん">
          {formatClock(elapsedMs)}
        </div>
      </header>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (answering ? 0 : 1)}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="quiz-body">
        <div className="question" aria-live="polite">
          <span className="question-text">
            {question.dan} × {question.multiplier} =
          </span>
        </div>

        <div
          className={
            'answer-box' + (feedback ? (feedback.correct ? ' is-correct' : ' is-wrong') : '')
          }
          aria-label="こたえ"
        >
          {input === '' ? <span className="answer-placeholder">?</span> : input}
        </div>

        <div className="feedback-area" role="status">
          {feedback &&
            (feedback.correct ? (
              <div className="feedback feedback-correct">
                <span className="feedback-icon" aria-hidden="true">
                  ⭐
                </span>
                せいかい！
              </div>
            ) : (
              <div className="feedback feedback-wrong">
                <span className="feedback-icon" aria-hidden="true">
                  💡
                </span>
                <span>
                  おしい！ こたえは <strong>{correctAnswer}</strong> だよ
                </span>
              </div>
            ))}
        </div>
      </div>

      <Numpad
        inputEnabled={answering}
        submitEnabled={answering ? input !== '' : true}
        submitLabel={answering ? 'こたえる' : isLast ? 'けっか' : 'つぎへ'}
        onDigit={addDigit}
        onDelete={deleteDigit}
        onSubmit={answering ? submit : tryAdvance}
      />

      {confirmingQuit && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="quit-title">
            <h2 id="quit-title">れんしゅうを やめる？</h2>
            <p>ここまでの きろくは のこらないよ。</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmingQuit(false)}>
                つづける
              </button>
              <button type="button" className="btn btn-primary" onClick={onQuit}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
