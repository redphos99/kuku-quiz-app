import type { AnswerLog, Order, QuizRecord, QuizSettings } from './types';
import { DANS, MAX_QUESTIONS, MIN_QUESTIONS } from './quiz';

const RECORDS_KEY = 'kakezan-kuku:records:v1';
const SETTINGS_KEY = 'kakezan-kuku:settings:v1';

export const DEFAULT_SETTINGS: QuizSettings = {
  questionCount: 10,
  range: [...DANS],
  order: 'random',
};

const ORDERS: readonly Order[] = ['asc', 'desc', 'random'];

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isAnswerLog(value: unknown): value is AnswerLog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isNumber(v.dan) &&
    isNumber(v.multiplier) &&
    isNumber(v.userAnswer) &&
    typeof v.correct === 'boolean' &&
    isNumber(v.seconds)
  );
}

function isRecord(value: unknown): value is QuizRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.date === 'string' &&
    Array.isArray(v.range) &&
    v.range.every(isNumber) &&
    ORDERS.includes(v.order as Order) &&
    isNumber(v.questionCount) &&
    isNumber(v.correctCount) &&
    isNumber(v.durationSeconds) &&
    Array.isArray(v.answers) &&
    v.answers.every(isAnswerLog)
  );
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    // ストレージ無効・JSON破損のときは「データなし」として扱う
    return null;
  }
}

/** 保存済みの記録を新しい順で返す */
export function loadRecords(): QuizRecord[] {
  const data = readJson(RECORDS_KEY);
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecord)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

/** 保存に成功したら true */
export function saveRecord(record: QuizRecord): boolean {
  try {
    const records = loadRecords();
    records.push(record);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(): QuizSettings {
  const data = readJson(SETTINGS_KEY);
  if (typeof data !== 'object' || data === null) return DEFAULT_SETTINGS;
  const v = data as Record<string, unknown>;

  const range = Array.isArray(v.range)
    ? v.range.filter((d): d is number => (DANS as readonly number[]).includes(d as number))
    : [];
  const count = v.questionCount;
  return {
    questionCount:
      isNumber(count) &&
      Number.isInteger(count) &&
      count >= MIN_QUESTIONS &&
      count <= MAX_QUESTIONS
        ? count
        : DEFAULT_SETTINGS.questionCount,
    range: range.length > 0 ? range : DEFAULT_SETTINGS.range,
    order: ORDERS.includes(v.order as Order)
      ? (v.order as Order)
      : DEFAULT_SETTINGS.order,
  };
}

export function saveSettings(settings: QuizSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 設定の記憶に失敗しても練習には影響しない
  }
}

/** crypto.randomUUID は http（非セキュア環境）では使えないため代替を用意する */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
