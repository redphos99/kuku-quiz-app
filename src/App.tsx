import { useEffect, useState } from 'react';
import type { Question, QuizRecord, QuizSettings } from './types';
import { missedQuestions } from './quiz';
import { createId, saveRecord } from './storage';
import { SettingsScreen } from './screens/SettingsScreen';
import { QuizScreen, type QuizResult } from './screens/QuizScreen';
import { ResultScreen } from './screens/ResultScreen';
import { HistoryScreen } from './screens/HistoryScreen';

type Screen =
  | { name: 'settings' }
  // 「もういちど」で同じ設定から新しい問題を作り直せるよう、round を鍵にして再マウントする。
  // questions があるときは、その問題だけを出題する（まちがえ直し）
  | { name: 'quiz'; settings: QuizSettings; round: number; questions?: Question[] }
  | {
      name: 'result';
      settings: QuizSettings;
      record: QuizRecord;
      saved: boolean;
      /** まちがえ直しの結果のとき、そのとき出題した問題（「おなじ もんだいで もういちど」用） */
      questions?: Question[];
    }
  | { name: 'history' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'settings' });
  const [round, setRound] = useState(0);

  // 画面が変わったら先頭から表示する
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const startQuiz = (settings: QuizSettings, questions?: Question[]) => {
    const next = round + 1;
    setRound(next);
    setScreen({ name: 'quiz', settings, round: next, questions });
  };

  const finishQuiz = (
    settings: QuizSettings,
    questions: Question[] | undefined,
    { answers, durationMs }: QuizResult,
  ) => {
    const record: QuizRecord = {
      id: createId(),
      date: new Date().toISOString(),
      range: questions
        ? [...new Set(questions.map((q) => q.dan))].sort((a, b) => a - b)
        : [...settings.range],
      order: settings.order,
      questionCount: answers.length,
      correctCount: answers.filter((a) => a.correct).length,
      durationSeconds: Math.round(durationMs / 1000),
      answers,
      ...(questions ? { mode: 'retry' as const } : {}),
    };
    const saved = saveRecord(record);
    setScreen({ name: 'result', settings, record, saved, questions });
  };

  switch (screen.name) {
    case 'settings':
      return <SettingsScreen onStart={startQuiz} onShowHistory={() => setScreen({ name: 'history' })} />;
    case 'quiz':
      return (
        <QuizScreen
          key={screen.round}
          settings={screen.settings}
          questions={screen.questions}
          onFinish={(result) => finishQuiz(screen.settings, screen.questions, result)}
          onQuit={() => setScreen({ name: 'settings' })}
        />
      );
    case 'result':
      return (
        <ResultScreen
          record={screen.record}
          saved={screen.saved}
          onRetry={() => startQuiz(screen.settings, screen.questions)}
          onRetryMissed={() => startQuiz(screen.settings, missedQuestions(screen.record.answers))}
          onBack={() => setScreen({ name: 'settings' })}
          onShowHistory={() => setScreen({ name: 'history' })}
        />
      );
    case 'history':
      return <HistoryScreen onBack={() => setScreen({ name: 'settings' })} />;
  }
}
