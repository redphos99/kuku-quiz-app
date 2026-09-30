import { useEffect, useState } from 'react';
import type { Question, QuizRecord, QuizSettings, Stage } from './types';
import { generateQuestions, missedQuestions } from './quiz';
import { isClearRecord, isStageUnlocked, nextStage, stageProgress, stageQuestions } from './stages';
import { createId, loadRecords, saveRecord } from './storage';
import { SettingsScreen } from './screens/SettingsScreen';
import { QuizScreen, type QuizResult } from './screens/QuizScreen';
import { ResultScreen, type StageOutcome } from './screens/ResultScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { StageScreen } from './screens/StageScreen';
import { HomeScreen } from './screens/HomeScreen';

/** どんな練習をするか */
type BasePlan = { kind: 'free'; settings: QuizSettings } | { kind: 'stage'; stage: Stage };
/** retry は、まちがえた問題だけをこの順で出題する（from は元の練習） */
type Plan = BasePlan | { kind: 'retry'; questions: Question[]; from: BasePlan };

type Screen =
  | { name: 'home' }
  | { name: 'settings' }
  // 「もういちど」で問題を作り直せるよう、round を鍵にして再マウントする
  | { name: 'quiz'; plan: Plan; questions: Question[]; round: number }
  | {
      name: 'result';
      plan: Plan;
      record: QuizRecord;
      saved: boolean;
      /** ステップれんしゅうのときのクリア判定 */
      outcome?: StageOutcome;
    }
  | { name: 'stages' }
  | { name: 'history' };

function baseOf(plan: Plan): BasePlan {
  return plan.kind === 'retry' ? plan.from : plan;
}

function questionsFor(plan: Plan): Question[] {
  switch (plan.kind) {
    case 'free':
      return generateQuestions(plan.settings);
    case 'stage':
      return stageQuestions(plan.stage);
    case 'retry':
      return plan.questions;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [round, setRound] = useState(0);

  // 画面が変わったら先頭から表示する
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const startQuiz = (plan: Plan) => {
    const next = round + 1;
    setRound(next);
    setScreen({ name: 'quiz', plan, questions: questionsFor(plan), round: next });
  };

  const finishQuiz = (plan: Plan, { answers, durationMs }: QuizResult) => {
    const base = baseOf(plan);
    const record: QuizRecord = {
      id: createId(),
      date: new Date().toISOString(),
      range:
        plan.kind === 'retry'
          ? [...new Set(plan.questions.map((q) => q.dan))].sort((a, b) => a - b)
          : base.kind === 'stage'
            ? [...base.stage.dans]
            : [...base.settings.range],
      order: base.kind === 'stage' ? base.stage.order : base.settings.order,
      questionCount: answers.length,
      correctCount: answers.filter((a) => a.correct).length,
      durationSeconds: Math.round(durationMs / 1000),
      answers,
      ...(plan.kind === 'retry' ? { mode: 'retry' as const } : {}),
      ...(base.kind === 'stage' ? { stageId: base.stage.id } : {}),
    };

    let outcome: StageOutcome | undefined;
    if (plan.kind === 'stage') {
      // 保存する前の進み具合と比べる（保存に失敗しても、今回のクリアは次の解放に反映する）
      const clearedBefore = new Set(stageProgress(loadRecords()).keys());
      const cleared = isClearRecord(record, plan.stage);
      const clearedNow = new Set(clearedBefore);
      if (cleared) clearedNow.add(plan.stage.id);
      const next = nextStage(plan.stage);
      outcome = {
        stage: plan.stage,
        cleared,
        firstClear: cleared && !clearedBefore.has(plan.stage.id),
        next: cleared && next && isStageUnlocked(next, clearedNow) ? next : undefined,
      };
    }
    const saved = saveRecord(record);
    setScreen({ name: 'result', plan, record, saved, outcome });
  };

  const showHome = () => setScreen({ name: 'home' });
  const showStages = () => setScreen({ name: 'stages' });
  const showSettings = () => setScreen({ name: 'settings' });
  const showHistory = () => setScreen({ name: 'history' });

  switch (screen.name) {
    case 'home':
      return (
        <HomeScreen onShowStages={showStages} onShowFree={showSettings} onShowHistory={showHistory} />
      );
    case 'settings':
      return (
        <SettingsScreen onStart={(settings) => startQuiz({ kind: 'free', settings })} onBack={showHome} />
      );
    case 'stages':
      return (
        <StageScreen onStart={(stage) => startQuiz({ kind: 'stage', stage })} onBack={showHome} />
      );
    case 'quiz': {
      const { plan } = screen;
      const stage = plan.kind === 'stage' ? plan.stage : undefined;
      return (
        <QuizScreen
          key={screen.round}
          questions={screen.questions}
          targetSeconds={stage?.targetSeconds}
          onFinish={(result) => finishQuiz(plan, result)}
          onQuit={baseOf(plan).kind === 'stage' ? showStages : showSettings}
        />
      );
    }
    case 'result': {
      const { plan, record } = screen;
      const base = baseOf(plan);
      const next = screen.outcome?.next;
      return (
        <ResultScreen
          record={record}
          saved={screen.saved}
          outcome={screen.outcome}
          onRetry={() => startQuiz(plan)}
          onRetryMissed={() =>
            startQuiz({ kind: 'retry', questions: missedQuestions(record.answers), from: base })
          }
          onNextStage={next && (() => startQuiz({ kind: 'stage', stage: next }))}
          backLabel={base.kind === 'stage' ? 'ステップにもどる' : 'せっていにもどる'}
          onBack={base.kind === 'stage' ? showStages : showSettings}
          onShowHistory={showHistory}
        />
      );
    }
    case 'history':
      return <HistoryScreen onBack={showHome} />;
  }
}
