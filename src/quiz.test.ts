import { describe, expect, it } from 'vitest';
import {
  accuracyPercent,
  formatClock,
  formatDate,
  formatDuration,
  formatRange,
  generateQuestions,
  poolSize,
} from './quiz';
import type { Question, QuizSettings } from './types';

const key = (q: Question) => `${q.dan}x${q.multiplier}`;

function settings(overrides: Partial<QuizSettings>): QuizSettings {
  return { questionCount: 10, range: [1, 2, 3, 4, 5, 6, 7, 8, 9], order: 'random', ...overrides };
}

describe('generateQuestions', () => {
  it('returns exactly the requested number of questions', () => {
    for (const questionCount of [1, 5, 10, 30, 81, 100]) {
      expect(generateQuestions(settings({ questionCount }))).toHaveLength(questionCount);
    }
  });

  it('only uses the selected dans', () => {
    const qs = generateQuestions(settings({ range: [2, 5], questionCount: 18 }));
    expect(new Set(qs.map((q) => q.dan))).toEqual(new Set([2, 5]));
  });

  it('does not repeat a question while the pool is not exhausted', () => {
    const qs = generateQuestions(settings({ range: [3, 4], questionCount: 18 }));
    expect(new Set(qs.map(key)).size).toBe(18);
  });

  it('covers the whole pool once before repeating', () => {
    const qs = generateQuestions(settings({ range: [7], questionCount: 12 }));
    expect(new Set(qs.slice(0, 9).map(key)).size).toBe(9);
  });

  it('orders by dan ascending, then multiplier ascending', () => {
    const qs = generateQuestions(settings({ order: 'asc', range: [2, 3, 9], questionCount: 27 }));
    expect(qs.map(key).slice(0, 3)).toEqual(['2x1', '2x2', '2x3']);
    expect(qs[9]).toEqual({ dan: 3, multiplier: 1 });
    expect(qs[26]).toEqual({ dan: 9, multiplier: 9 });
  });

  it('orders by dan descending, keeping 1→9 inside a dan', () => {
    const qs = generateQuestions(settings({ order: 'desc', range: [2, 3, 9], questionCount: 27 }));
    expect(qs[0]).toEqual({ dan: 9, multiplier: 1 });
    expect(qs[8]).toEqual({ dan: 9, multiplier: 9 });
    expect(qs[26]).toEqual({ dan: 2, multiplier: 9 });
  });

  it('keeps dan order for a partial sample', () => {
    const qs = generateQuestions(settings({ order: 'asc', questionCount: 10 }));
    const dans = qs.map((q) => q.dan);
    expect(dans).toEqual([...dans].sort((a, b) => a - b));
  });

  it('never puts the same question back-to-back in random order', () => {
    for (let i = 0; i < 200; i++) {
      const qs = generateQuestions(settings({ range: [1], questionCount: 40 }));
      for (let j = 1; j < qs.length; j++) {
        expect(key(qs[j])).not.toBe(key(qs[j - 1]));
      }
    }
  });

  it('returns nothing when no dan is selected', () => {
    expect(generateQuestions(settings({ range: [] }))).toEqual([]);
  });
});

describe('formatting helpers', () => {
  it('formats ranges compactly', () => {
    expect(formatRange([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe('1〜9のだん');
    expect(formatRange([2, 5])).toBe('2・5のだん');
    expect(formatRange([1, 2])).toBe('1・2のだん');
    expect(formatRange([9, 3, 4, 5, 1])).toBe('1・3〜5・9のだん');
    expect(formatRange([7])).toBe('7のだん');
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45秒');
    expect(formatDuration(83)).toBe('1分23秒');
    expect(formatDuration(120)).toBe('2分0秒');
  });

  it('formats the running clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(83_400)).toBe('1:23');
  });

  it('computes accuracy', () => {
    expect(accuracyPercent(8, 10)).toBe(80);
    expect(accuracyPercent(0, 0)).toBe(0);
    expect(accuracyPercent(1, 3)).toBe(33);
  });

  it('formats dates, adding the year only when it differs', () => {
    const now = new Date(2026, 8, 21);
    expect(formatDate(new Date(2026, 8, 20, 9, 5).toISOString(), now)).toBe('9月20日 9:05');
    expect(formatDate(new Date(2025, 11, 31, 18, 30).toISOString(), now)).toBe('2025年12月31日 18:30');
    expect(formatDate('not a date', now)).toBe('-');
  });

  it('counts the pool', () => {
    expect(poolSize([2, 5])).toBe(18);
    expect(poolSize([2, 2])).toBe(9);
  });
});
