import { useState } from 'react';
import type { Stage, StageStep } from '../types';
import { ORDERS, formatDans, formatDuration, poolSize } from '../quiz';
import {
  PATTERN_LABELS,
  STAGES,
  STEP_TITLES,
  isStageUnlocked,
  stageLabel,
  stageProgress,
  type StageProgress,
} from '../stages';
import { loadRecords } from '../storage';

interface StageScreenProps {
  onStart: (stage: Stage) => void;
  onBack: () => void;
}

const STEP_HINTS: Record<StageStep, string> = {
  1: 'すきな だんから はじめてね。じゅんばん → ぎゃく → ランダム の じゅんに あそべるよ',
  2: 'ステップ1で 3つの だんを ぜんぶ クリアすると あそべるよ',
  3: 'ステップ2を ぜんぶ クリアすると あそべるよ',
};

interface StageButtonProps {
  stage: Stage;
  progress: StageProgress | undefined;
  unlocked: boolean;
  onStart: (stage: Stage) => void;
}

function StageButton({ stage, progress, unlocked, onStart }: StageButtonProps) {
  const label = stageLabel(stage);
  const status = progress
    ? `クリア、いちばん はやい きろく ${formatDuration(progress.bestSeconds)}`
    : unlocked
      ? `もくひょう ${formatDuration(stage.targetSeconds)}`
      : 'まだ あそべないよ';
  return (
    <button
      type="button"
      className={'stage-btn' + (progress ? ' is-cleared' : '')}
      disabled={!unlocked}
      aria-label={`${label}（${status}）`}
      onClick={() => onStart(stage)}
    >
      <span className="stage-icon" aria-hidden="true">
        {progress ? '⭐' : unlocked ? '▶' : '🔒'}
      </span>
      {progress && <span className="stage-best">{formatDuration(progress.bestSeconds)}</span>}
    </button>
  );
}

export function StageScreen({ onStart, onBack }: StageScreenProps) {
  const [progress] = useState(() => stageProgress(loadRecords()));
  const clearedCount = progress.size;

  const button = (stage: Stage) => (
    <StageButton
      key={stage.id}
      stage={stage}
      progress={progress.get(stage.id)}
      unlocked={isStageUnlocked(stage, progress)}
      onStart={onStart}
    />
  );

  /** ステップ1・2: 行が段（のまとまり）、列が じゅんばん／ぎゃく／ランダム の表 */
  const table = (step: 1 | 2) => {
    // 段（のまとまり）ごとに、じゅんばん → ぎゃく → ランダム の順で並んでいる
    const stages = STAGES.filter((s) => s.step === step);
    const rows: Stage[][] = [];
    for (let i = 0; i < stages.length; i += ORDERS.length) rows.push(stages.slice(i, i + ORDERS.length));
    return (
      <div className="stage-table" role="group" aria-label={STEP_TITLES[step]}>
        <span aria-hidden="true" />
        {rows[0].map((s) => (
          <span key={s.order} className="stage-col-head" aria-hidden="true">
            {PATTERN_LABELS[s.order]}
            <small>{formatDuration(s.targetSeconds)}</small>
          </span>
        ))}
        {rows.map((row) => (
          <div key={row[0].id} className="stage-row">
            <span className="stage-row-head" aria-hidden="true">
              {formatDans(row[0].dans)}
              <small>のだん</small>
            </span>
            {row.map(button)}
          </div>
        ))}
      </div>
    );
  };

  const finalStage = STAGES.find((s) => s.step === 3)!;
  const finalProgress = progress.get(finalStage.id);
  const finalUnlocked = isStageUnlocked(finalStage, progress);

  return (
    <main className="screen stages">
      <header className="top-bar">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← もどる
        </button>
        <h1 className="page-title">ステップ</h1>
        <span className="top-bar-spacer stage-total" aria-label={`クリア ${clearedCount} / ${STAGES.length}`}>
          ⭐ {clearedCount}/{STAGES.length}
        </span>
      </header>

      <p className="hint">
        ぜんぶ せいかいで、もくひょうの じかんより はやく こたえられたら クリア！
      </p>

      {([1, 2] as const).map((step) => (
        <section key={step} className="panel" aria-labelledby={`step${step}-heading`}>
          <h2 id={`step${step}-heading`}>{STEP_TITLES[step]}</h2>
          <p className="hint">{STEP_HINTS[step]}</p>
          {table(step)}
        </section>
      ))}

      <section className="panel" aria-labelledby="step3-heading">
        <h2 id="step3-heading">{STEP_TITLES[3]}</h2>
        <p className="hint">
          {STEP_HINTS[3]}（{poolSize(finalStage.dans)}もん {PATTERN_LABELS[finalStage.order]}・もくひょう{' '}
          {formatDuration(finalStage.targetSeconds)}）
        </p>
        <button
          type="button"
          className={'btn btn-big stage-final' + (finalProgress ? ' is-cleared' : ' btn-primary')}
          disabled={!finalUnlocked}
          onClick={() => onStart(finalStage)}
        >
          {finalProgress
            ? `⭐ クリア（${formatDuration(finalProgress.bestSeconds)}）`
            : finalUnlocked
              ? 'ちょうせんする！'
              : '🔒 まだ あそべないよ'}
        </button>
      </section>
    </main>
  );
}
