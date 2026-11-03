import type { QuizRecord } from './types';
import { DANS } from './quiz';

/** 苦手マップで見る、問題ごとの直近の回数 */
export const RECENT_ATTEMPTS = 10;
/** よくある間違いとして表示する件数 */
export const MISTAKE_COUNT = 5;
/** 伸びの推移で表示する週の数 */
export const TREND_WEEKS = 12;

/** ぶんせきに使う記録（まちがえ直しは、答えを見た直後なので除く）。新しい順 */
function analysisRecords(records: readonly QuizRecord[]): QuizRecord[] {
  return records
    .filter((r) => r.mode !== 'retry')
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export interface ProblemStat {
  dan: number;
  multiplier: number;
  /** 直近の回答数（最大 RECENT_ATTEMPTS） */
  attempts: number;
  correct: number;
  /** 正解したときの平均回答秒数（正解がなければ undefined） */
  avgSeconds: number | undefined;
}

/** 問題ごとの直近 RECENT_ATTEMPTS 回の成績。[段-1][乗数-1] の 9×9 */
export function problemStats(records: readonly QuizRecord[]): ProblemStat[][] {
  const recent = new Map<string, { correct: boolean; seconds: number }[]>();
  for (const record of analysisRecords(records)) {
    // 同じ記録の中では、あとに答えたほうが新しい
    for (const a of [...record.answers].reverse()) {
      const key = `${a.dan}x${a.multiplier}`;
      const list = recent.get(key) ?? [];
      if (list.length < RECENT_ATTEMPTS) list.push(a);
      recent.set(key, list);
    }
  }
  return DANS.map((dan) =>
    DANS.map((multiplier) => {
      const list = recent.get(`${dan}x${multiplier}`) ?? [];
      const correct = list.filter((a) => a.correct);
      return {
        dan,
        multiplier,
        attempts: list.length,
        correct: correct.length,
        avgSeconds:
          correct.length === 0
            ? undefined
            : correct.reduce((sum, a) => sum + a.seconds, 0) / correct.length,
      };
    }),
  );
}

/** 苦手マップの濃さ（0＝とくい 〜 4＝にがて）。まだ出題されていなければ undefined */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function accuracyLevel(stat: ProblemStat): HeatLevel | undefined {
  if (stat.attempts === 0) return undefined;
  const percent = (stat.correct / stat.attempts) * 100;
  if (percent === 100) return 0;
  if (percent >= 90) return 1;
  if (percent >= 75) return 2;
  if (percent >= 50) return 3;
  return 4;
}

export function speedLevel(stat: ProblemStat): HeatLevel | undefined {
  if (stat.attempts === 0) return undefined;
  // 一度も正解していなければ、いちばん にがて
  if (stat.avgSeconds === undefined) return 4;
  if (stat.avgSeconds < 2) return 0;
  if (stat.avgSeconds < 3) return 1;
  if (stat.avgSeconds < 4) return 2;
  if (stat.avgSeconds < 6) return 3;
  return 4;
}

export interface Mistake {
  dan: number;
  multiplier: number;
  userAnswer: number;
  count: number;
}

/** 同じ問題に同じまちがった答えをした回数の多い順（同じ回数なら最近のものが先） */
export function commonMistakes(
  records: readonly QuizRecord[],
  count = MISTAKE_COUNT,
): Mistake[] {
  const mistakes = new Map<string, Mistake>();
  for (const record of analysisRecords(records)) {
    for (const a of record.answers) {
      if (a.correct) continue;
      const key = `${a.dan}x${a.multiplier}=${a.userAnswer}`;
      const current = mistakes.get(key);
      if (current) current.count++;
      else mistakes.set(key, { dan: a.dan, multiplier: a.multiplier, userAnswer: a.userAnswer, count: 1 });
    }
  }
  // Map は最近の記録から入れているので、安定ソートで同数なら最近のものが先になる
  return [...mistakes.values()].sort((a, b) => b.count - a.count).slice(0, count);
}

export interface WeekStat {
  /** 週のはじめ（月曜日 0:00、ローカル時刻）の ISO 8601 */
  weekStart: string;
  questions: number;
  correct: number;
  /** 正解したときの平均回答秒数（正解がなければ undefined） */
  avgSeconds: number | undefined;
}

/** その日を含む週の月曜日 0:00（ローカル時刻） */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** 週ごとの成績。練習した週だけを古い順に、新しいほうから TREND_WEEKS 週ぶん */
export function weeklyTrend(records: readonly QuizRecord[], weeks = TREND_WEEKS): WeekStat[] {
  const byWeek = new Map<number, { questions: number; correct: number; seconds: number }>();
  for (const record of analysisRecords(records)) {
    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) continue;
    const key = startOfWeek(date).getTime();
    const week = byWeek.get(key) ?? { questions: 0, correct: 0, seconds: 0 };
    for (const a of record.answers) {
      week.questions++;
      if (a.correct) {
        week.correct++;
        week.seconds += a.seconds;
      }
    }
    byWeek.set(key, week);
  }
  return [...byWeek.entries()]
    .filter(([, w]) => w.questions > 0)
    .sort(([a], [b]) => a - b)
    .slice(-weeks)
    .map(([key, w]) => ({
      weekStart: new Date(key).toISOString(),
      questions: w.questions,
      correct: w.correct,
      avgSeconds: w.correct === 0 ? undefined : w.seconds / w.correct,
    }));
}

/** 週のはじめの日付 → "11/3" */
export function formatWeek(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
