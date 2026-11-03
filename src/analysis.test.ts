import { describe, expect, it } from 'vitest';
import {
  RECENT_ATTEMPTS,
  accuracyLevel,
  commonMistakes,
  formatWeek,
  problemStats,
  speedLevel,
  startOfWeek,
  weeklyTrend,
  type ProblemStat,
} from './analysis';
import type { AnswerLog, QuizRecord } from './types';

function answer(dan: number, multiplier: number, userAnswer = dan * multiplier, seconds = 2): AnswerLog {
  return { dan, multiplier, userAnswer, correct: userAnswer === dan * multiplier, seconds };
}

function record(date: string, answers: AnswerLog[], overrides: Partial<QuizRecord> = {}): QuizRecord {
  return {
    id: Math.random().toString(36),
    date,
    range: [...new Set(answers.map((a) => a.dan))],
    order: 'random',
    questionCount: answers.length,
    correctCount: answers.filter((a) => a.correct).length,
    durationSeconds: 60,
    answers,
    ...overrides,
  };
}

function stat(overrides: Partial<ProblemStat>): ProblemStat {
  return { dan: 1, multiplier: 1, attempts: 10, correct: 10, avgSeconds: 1.5, ...overrides };
}

describe('problemStats', () => {
  it('summarizes the most recent attempts of each problem, ignoring retries', () => {
    const older = record('2026-10-01T10:00:00.000Z', Array.from({ length: RECENT_ATTEMPTS }, () => answer(7, 8, 54)));
    const newer = record('2026-10-02T10:00:00.000Z', [answer(7, 8, 56, 3), answer(7, 8, 56, 5)]);
    const retry = record('2026-10-03T10:00:00.000Z', [answer(7, 8, 56)], { mode: 'retry' });
    const s = problemStats([older, retry, newer])[6][7];
    expect(s).toEqual({ dan: 7, multiplier: 8, attempts: RECENT_ATTEMPTS, correct: 2, avgSeconds: 4 });
    expect(problemStats([])[0][0].attempts).toBe(0);
  });

  it('takes later answers in the same record as newer', () => {
    const answers = [
      ...Array.from({ length: RECENT_ATTEMPTS }, () => answer(2, 3, 5)),
      ...Array.from({ length: RECENT_ATTEMPTS }, () => answer(2, 3)),
    ];
    expect(problemStats([record('2026-10-01T10:00:00.000Z', answers)])[1][2].correct).toBe(RECENT_ATTEMPTS);
  });
});

describe('heat levels', () => {
  it('grades accuracy', () => {
    expect(accuracyLevel(stat({ attempts: 0, correct: 0 }))).toBeUndefined();
    expect(accuracyLevel(stat({ correct: 10 }))).toBe(0);
    expect(accuracyLevel(stat({ correct: 9 }))).toBe(1);
    expect(accuracyLevel(stat({ correct: 8 }))).toBe(2);
    expect(accuracyLevel(stat({ correct: 5 }))).toBe(3);
    expect(accuracyLevel(stat({ correct: 4 }))).toBe(4);
  });

  it('grades speed, treating never-correct as the weakest', () => {
    expect(speedLevel(stat({ attempts: 0 }))).toBeUndefined();
    expect(speedLevel(stat({ avgSeconds: 1.9 }))).toBe(0);
    expect(speedLevel(stat({ avgSeconds: 2 }))).toBe(1);
    expect(speedLevel(stat({ avgSeconds: 3.5 }))).toBe(2);
    expect(speedLevel(stat({ avgSeconds: 5 }))).toBe(3);
    expect(speedLevel(stat({ avgSeconds: 6 }))).toBe(4);
    expect(speedLevel(stat({ correct: 0, avgSeconds: undefined }))).toBe(4);
  });
});

describe('commonMistakes', () => {
  it('counts the same wrong answer to the same problem, most frequent first', () => {
    const records = [
      record('2026-10-01T10:00:00.000Z', [answer(7, 8, 54), answer(6, 7, 48), answer(7, 8, 54)]),
      record('2026-10-02T10:00:00.000Z', [answer(7, 8, 54), answer(7, 8, 63), answer(9, 9, 72)]),
      record('2026-10-03T10:00:00.000Z', [answer(7, 8, 54)], { mode: 'retry' }),
    ];
    expect(commonMistakes(records)).toEqual([
      { dan: 7, multiplier: 8, userAnswer: 54, count: 3 },
      // 同じ回数なら最近のものが先
      { dan: 7, multiplier: 8, userAnswer: 63, count: 1 },
      { dan: 9, multiplier: 9, userAnswer: 72, count: 1 },
      { dan: 6, multiplier: 7, userAnswer: 48, count: 1 },
    ]);
    expect(commonMistakes(records, 1)).toHaveLength(1);
  });
});

describe('weeklyTrend', () => {
  it('groups practice by week (Monday start), oldest first', () => {
    const records = [
      // 2026-11-02 は月曜日
      record(new Date(2026, 10, 2, 9).toISOString(), [answer(2, 2, 4, 2), answer(2, 3, 5)]),
      record(new Date(2026, 10, 8, 20).toISOString(), [answer(3, 3, 9, 4)]),
      record(new Date(2026, 10, 1, 20).toISOString(), [answer(1, 1, 1, 1)]),
      record(new Date(2026, 10, 5).toISOString(), [answer(5, 5, 20)], { mode: 'retry' }),
    ];
    expect(weeklyTrend(records)).toEqual([
      { weekStart: new Date(2026, 9, 26).toISOString(), questions: 1, correct: 1, avgSeconds: 1 },
      { weekStart: new Date(2026, 10, 2).toISOString(), questions: 3, correct: 2, avgSeconds: 3 },
    ]);
    expect(weeklyTrend(records, 1)).toHaveLength(1);
  });

  it('finds the Monday of the week and formats it', () => {
    expect(startOfWeek(new Date(2026, 10, 8, 23, 59))).toEqual(new Date(2026, 10, 2));
    expect(startOfWeek(new Date(2026, 10, 2))).toEqual(new Date(2026, 10, 2));
    expect(formatWeek(new Date(2026, 10, 2).toISOString())).toBe('11/2');
  });
});
