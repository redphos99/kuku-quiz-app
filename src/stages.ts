import type { Order, Question, QuizRecord, Stage, StageStep } from './types';
import { DANS, ORDERS, formatRange, generateQuestions, poolSize } from './quiz';

export const PATTERN_LABELS: Record<Order, string> = {
  asc: 'じゅんばん',
  desc: 'ぎゃく',
  random: 'ランダム',
};

export const STEP_TITLES: Record<StageStep, string> = {
  1: 'ステップ1　1つの だん',
  2: 'ステップ2　3つの だん',
  3: 'ステップ3　ぜんぶの だん',
};

/**
 * 1問あたりの目標秒数。あとのステージほど少しずつきびしくする。
 * 正解後の自動送り（約0.9秒）も所要時間に含まれるので、その分も見込んだ値にしている
 */
const SECONDS_PER_QUESTION: Record<StageStep, Record<Order, number>> = {
  1: { asc: 6, desc: 5, random: 5 },
  2: { asc: 5, desc: 4, random: 4 },
  3: { asc: 3, desc: 3, random: 3 },
};

/** ステップ2でまとめる段 */
const STEP2_GROUPS: readonly number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

function stageId(dans: readonly number[], order: Order): string {
  return `${dans.join('')}-${order}`;
}

function makeStage(step: StageStep, dans: number[], order: Order, requires: string[]): Stage {
  return {
    id: stageId(dans, order),
    step,
    dans,
    order,
    targetSeconds: poolSize(dans) * SECONDS_PER_QUESTION[step][order],
    requires,
  };
}

/** じゅんばん → ぎゃく → ランダム の順に解放される3ステージ */
function patternStages(step: StageStep, dans: number[], firstRequires: string[]): Stage[] {
  let requires = firstRequires;
  return ORDERS.map((order) => {
    const stage = makeStage(step, dans, order, requires);
    requires = [stage.id];
    return stage;
  });
}

function buildStages(): Stage[] {
  // ステップ1: どの段の「じゅんばん」からでも始められる
  const step1 = DANS.flatMap((dan) => patternStages(1, [dan], []));
  // ステップ2: まとめた段をステップ1でぜんぶクリアすると解放
  const step2 = STEP2_GROUPS.flatMap((dans) =>
    patternStages(
      2,
      [...dans],
      step1.filter((s) => dans.includes(s.dans[0])).map((s) => s.id),
    ),
  );
  // ステップ3: ステップ2をぜんぶクリアすると解放
  const step3 = [makeStage(3, [...DANS], 'random', step2.map((s) => s.id))];
  return [...step1, ...step2, ...step3];
}

/** 全ステージ（おすすめの順） */
export const STAGES: readonly Stage[] = buildStages();

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function findStage(id: string | undefined): Stage | undefined {
  return id === undefined ? undefined : STAGE_BY_ID.get(id);
}

/** 「3のだん ぎゃく」「1〜3のだん ランダム」「ぜんぶの だん」 */
export function stageLabel(stage: Stage): string {
  if (stage.step === 3) return 'ぜんぶの だん';
  return `${formatRange(stage.dans)} ${PATTERN_LABELS[stage.order]}`;
}

/** ステージの問題列。どの問題も1回ずつ出す */
export function stageQuestions(stage: Stage, rand: () => number = Math.random): Question[] {
  const base = { questionCount: poolSize(stage.dans), range: stage.dans };
  if (stage.order === 'random') return generateQuestions({ ...base, order: 'random' }, rand);
  // 小さい段の ×1 から順に。ぎゃくは、そのまま逆から（大きい段の ×9 から）
  const asc = generateQuestions({ ...base, order: 'asc' }, rand);
  return stage.order === 'asc' ? asc : asc.reverse();
}

/** この記録でステージをクリアしたか（全問正解かつ目標タイム以内。やりなおしは対象外） */
export function isClearRecord(record: QuizRecord, stage: Stage): boolean {
  return (
    record.stageId === stage.id &&
    record.mode !== 'retry' &&
    record.questionCount === poolSize(stage.dans) &&
    record.correctCount === record.questionCount &&
    record.durationSeconds <= stage.targetSeconds
  );
}

export interface StageProgress {
  /** クリアした記録のうち、いちばん速い所要時間（秒） */
  bestSeconds: number;
  /** はじめてクリアした日時（ISO 8601） */
  firstClearedAt: string;
}

/** 記録から、クリア済みのステージとその成績をまとめる */
export function stageProgress(records: readonly QuizRecord[]): Map<string, StageProgress> {
  const progress = new Map<string, StageProgress>();
  for (const record of records) {
    const stage = findStage(record.stageId);
    if (!stage || !isClearRecord(record, stage)) continue;
    const current = progress.get(stage.id);
    progress.set(stage.id, {
      bestSeconds: Math.min(current?.bestSeconds ?? Infinity, record.durationSeconds),
      firstClearedAt:
        current && Date.parse(current.firstClearedAt) < Date.parse(record.date)
          ? current.firstClearedAt
          : record.date,
    });
  }
  return progress;
}

export function isStageUnlocked(stage: Stage, cleared: { has(id: string): boolean }): boolean {
  return stage.requires.every((id) => cleared.has(id));
}

/** おすすめの順で次のステージ（最後なら undefined） */
export function nextStage(stage: Stage): Stage | undefined {
  const index = STAGES.findIndex((s) => s.id === stage.id);
  return index === -1 ? undefined : STAGES[index + 1];
}

/** ステップれんしゅうの結果 */
export interface StageOutcome {
  stage: Stage;
  cleared: boolean;
  /** はじめてのクリアか */
  firstClear: boolean;
  /** 次のステージ（クリアして、次が解放されているときだけ） */
  next?: Stage;
}

/**
 * 今回の記録の結果を、それまでの記録と比べて判定する
 * （previous は今回の記録を含まない。保存に失敗しても、今回のクリアは次の解放に反映する）
 */
export function stageOutcome(
  record: QuizRecord,
  stage: Stage,
  previous: readonly QuizRecord[],
): StageOutcome {
  const progress = stageProgress(previous);
  const cleared = isClearRecord(record, stage);
  const next = nextStage(stage);
  const clearedNow = { has: (id: string) => progress.has(id) || (cleared && id === stage.id) };
  return {
    stage,
    cleared,
    firstClear: cleared && !progress.has(stage.id),
    next: cleared && next && isStageUnlocked(next, clearedNow) ? next : undefined,
  };
}
