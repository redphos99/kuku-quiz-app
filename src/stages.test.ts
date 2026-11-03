import { describe, expect, it } from 'vitest';
import {
  STAGES,
  findStage,
  isClearRecord,
  isStageUnlocked,
  nextStage,
  stageLabel,
  stageOutcome,
  stageProgress,
  stageQuestions,
} from './stages';
import type { Question, QuizRecord, Stage } from './types';

const key = (q: Question) => `${q.dan}x${q.multiplier}`;

function stage(id: string): Stage {
  const s = findStage(id);
  if (!s) throw new Error(`no stage ${id}`);
  return s;
}

function record(s: Stage, overrides: Partial<QuizRecord> = {}): QuizRecord {
  const count = s.dans.length * 9;
  return {
    id: Math.random().toString(36),
    date: '2026-09-01T10:00:00.000Z',
    range: s.dans,
    order: s.order,
    questionCount: count,
    correctCount: count,
    durationSeconds: s.targetSeconds,
    answers: [],
    stageId: s.id,
    ...overrides,
  };
}

describe('STAGES', () => {
  it('has 3 patterns for each dan, 3 patterns for each group of 3 dans, and one final stage', () => {
    expect(STAGES.filter((s) => s.step === 1)).toHaveLength(27);
    expect(STAGES.filter((s) => s.step === 2)).toHaveLength(9);
    expect(STAGES.filter((s) => s.step === 3)).toHaveLength(1);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
  });

  it('only refers to existing stages as prerequisites, listed earlier', () => {
    STAGES.forEach((s, i) => {
      for (const id of s.requires) {
        const index = STAGES.findIndex((t) => t.id === id);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(i);
      }
    });
  });

  it('gets stricter per question in later steps', () => {
    const perQuestion = (s: Stage) => s.targetSeconds / (s.dans.length * 9);
    expect(perQuestion(stage('3-asc'))).toBeGreaterThan(perQuestion(stage('123-asc')));
    expect(perQuestion(stage('123-random'))).toBeGreaterThan(perQuestion(stage('123456789-random')));
  });
});

describe('stageQuestions', () => {
  it('goes ×1 → ×9 for "asc" in a single dan', () => {
    expect(stageQuestions(stage('4-asc')).map((q) => q.multiplier)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('goes ×9 → ×1 for "desc" in a single dan', () => {
    expect(stageQuestions(stage('4-desc')).map((q) => q.multiplier)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('reverses the whole list for "desc" across dans', () => {
    const asc = stageQuestions(stage('456-asc'));
    const desc = stageQuestions(stage('456-desc'));
    expect(desc).toEqual([...asc].reverse());
    expect(desc[0]).toEqual({ dan: 6, multiplier: 9 });
  });

  it('asks every question exactly once', () => {
    for (const s of STAGES) {
      const qs = stageQuestions(s);
      expect(qs).toHaveLength(s.dans.length * 9);
      expect(new Set(qs.map(key)).size).toBe(qs.length);
      expect(qs.every((q) => s.dans.includes(q.dan))).toBe(true);
    }
  });
});

describe('isClearRecord', () => {
  const s = stage('7-random');

  it('clears with all correct within the target time', () => {
    expect(isClearRecord(record(s), s)).toBe(true);
  });

  it('does not clear when a question was missed', () => {
    expect(isClearRecord(record(s, { correctCount: 8 }), s)).toBe(false);
  });

  it('does not clear when slower than the target', () => {
    expect(isClearRecord(record(s, { durationSeconds: s.targetSeconds + 1 }), s)).toBe(false);
  });

  it('does not count retries or other stages', () => {
    expect(isClearRecord(record(s, { mode: 'retry' }), s)).toBe(false);
    expect(isClearRecord(record(s, { stageId: '7-asc' }), s)).toBe(false);
  });
});

describe('stageProgress', () => {
  it('keeps the best time and the first clear date of cleared stages only', () => {
    const s = stage('2-asc');
    const progress = stageProgress([
      record(s, { durationSeconds: 40, date: '2026-09-03T00:00:00.000Z' }),
      record(s, { durationSeconds: 30, date: '2026-09-02T00:00:00.000Z' }),
      record(s, { durationSeconds: 20, correctCount: 8 }),
      record(stage('2-desc'), { durationSeconds: 999 }),
      record(s, { stageId: 'unknown-stage' }),
    ]);
    expect([...progress.keys()]).toEqual(['2-asc']);
    expect(progress.get('2-asc')).toEqual({
      bestSeconds: 30,
      firstClearedAt: '2026-09-02T00:00:00.000Z',
    });
  });
});

describe('isStageUnlocked / nextStage', () => {
  it('opens "asc" of every dan from the start, and the rest in order', () => {
    const none = new Set<string>();
    expect(STAGES.filter((s) => isStageUnlocked(s, none)).map((s) => s.id)).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `${d}-asc`),
    );
    expect(isStageUnlocked(stage('5-desc'), new Set(['5-asc']))).toBe(true);
    expect(isStageUnlocked(stage('5-random'), new Set(['5-asc']))).toBe(false);
  });

  it('opens a step 2 group after clearing every stage of its dans', () => {
    const group = stage('123-asc');
    const all = STAGES.filter((s) => s.step === 1 && s.dans[0] <= 3).map((s) => s.id);
    expect(isStageUnlocked(group, new Set(all))).toBe(true);
    expect(isStageUnlocked(group, new Set(all.slice(1)))).toBe(false);
  });

  it('opens the final stage after clearing all of step 2', () => {
    const final = stage('123456789-random');
    const step2 = STAGES.filter((s) => s.step === 2).map((s) => s.id);
    expect(isStageUnlocked(final, new Set(step2))).toBe(true);
    expect(isStageUnlocked(final, new Set(step2.slice(1)))).toBe(false);
  });

  it('follows the recommended order', () => {
    expect(nextStage(stage('1-asc'))?.id).toBe('1-desc');
    expect(nextStage(stage('1-random'))?.id).toBe('2-asc');
    expect(nextStage(stage('9-random'))?.id).toBe('123-asc');
    expect(nextStage(stage('123456789-random'))).toBeUndefined();
  });
});

describe('stageOutcome', () => {
  it('reports a first clear and the next stage that it unlocks', () => {
    const s = stage('2-asc');
    expect(stageOutcome(record(s), s, [])).toEqual({
      stage: s,
      cleared: true,
      firstClear: true,
      next: stage('2-desc'),
    });
  });

  it('is not a first clear when the stage was cleared before', () => {
    const s = stage('2-asc');
    expect(stageOutcome(record(s), s, [record(s)]).firstClear).toBe(false);
  });

  it('gives no next stage when not cleared, or when the next one is still locked', () => {
    const s = stage('2-asc');
    const slow = stageOutcome(record(s, { durationSeconds: s.targetSeconds + 1 }), s, []);
    expect(slow).toMatchObject({ cleared: false, firstClear: false, next: undefined });
    // 9-random のつぎの 123-asc は、ステップ1の1〜3のだんを ぜんぶ クリアするまで あそべない
    expect(stageOutcome(record(stage('9-random')), stage('9-random'), []).next).toBeUndefined();
  });
});

describe('stageLabel', () => {
  it('names the stage for children', () => {
    expect(stageLabel(stage('3-desc'))).toBe('3のだん ぎゃく');
    expect(stageLabel(stage('789-random'))).toBe('7〜9のだん ランダム');
    expect(stageLabel(stage('123456789-random'))).toBe('ぜんぶの だん');
  });
});
