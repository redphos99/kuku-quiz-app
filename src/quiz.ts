import type { Order, Question, QuizSettings } from './types';

export const DANS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const MULTIPLIERS = DANS;

export const COUNT_PRESETS = [5, 10, 20, 30] as const;
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 100;

export const ORDER_LABELS: Record<Order, string> = {
  asc: '1のだん → 9のだん',
  desc: '9のだん → 1のだん',
  random: 'ランダム',
};

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isSame(a: Question, b: Question): boolean {
  return a.dan === b.dan && a.multiplier === b.multiplier;
}

/** 段の順に並べる。各段の中は 1→9 の順（九九を唱える順）で固定 */
function sortByDan(chunk: Question[], order: 'asc' | 'desc'): Question[] {
  const sign = order === 'asc' ? 1 : -1;
  return [...chunk].sort(
    (a, b) => sign * (a.dan - b.dan) || a.multiplier - b.multiplier,
  );
}

/**
 * 設定に従って問題列を作る。
 * - 出題範囲の全問題（段×1〜9）から、同じ問題が重ならないよう選ぶ
 * - 出題数が全問題数を超える場合は、全問題を一巡してからもう一巡する
 * - 昇順・降順は段の順、ランダムは完全にシャッフル
 */
export function generateQuestions(
  settings: QuizSettings,
  rand: () => number = Math.random,
): Question[] {
  const dans = [...new Set(settings.range)].filter((d) =>
    (DANS as readonly number[]).includes(d),
  );
  const pool: Question[] = dans.flatMap((dan) =>
    MULTIPLIERS.map((multiplier) => ({ dan, multiplier })),
  );
  if (pool.length === 0) return [];

  const result: Question[] = [];
  while (result.length < settings.questionCount) {
    const remaining = settings.questionCount - result.length;
    let chunk = shuffle(pool, rand).slice(0, Math.min(remaining, pool.length));

    if (settings.order === 'random') {
      // 巡目の境目で同じ問題が連続しないようにする
      const last = result[result.length - 1];
      if (last && chunk.length > 1 && isSame(chunk[0], last)) {
        [chunk[0], chunk[1]] = [chunk[1], chunk[0]];
      }
    } else {
      chunk = sortByDan(chunk, settings.order);
    }
    result.push(...chunk);
  }
  return result;
}

/** 選ばれた段の数から、全問題数を返す */
export function poolSize(range: readonly number[]): number {
  return new Set(range).size * MULTIPLIERS.length;
}

/** [1,2,3,5,9] → "1〜3・5・9のだん" */
export function formatRange(range: readonly number[]): string {
  const sorted = [...new Set(range)].sort((a, b) => a - b);
  if (sorted.length === 0) return '-';

  const runs: number[][] = [];
  for (const dan of sorted) {
    const current = runs[runs.length - 1];
    if (current && dan === current[current.length - 1] + 1) current.push(dan);
    else runs.push([dan]);
  }
  const parts = runs.flatMap((run) =>
    run.length >= 3 ? [`${run[0]}〜${run[run.length - 1]}`] : run.map(String),
  );
  return `${parts.join('・')}のだん`;
}

/** 83 → "1分23秒" */
export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
}

/** 83000 → "1:23"（練習中のタイマー表示用） */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function accuracyPercent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

/** 記録一覧用の日時表記。今年以外は年も付ける */
export function formatDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const year = d.getFullYear() === now.getFullYear() ? '' : `${d.getFullYear()}年`;
  return `${year}${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
}
