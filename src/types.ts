export type Order = 'asc' | 'desc' | 'random';

export interface QuizSettings {
  questionCount: number;
  /** 出題する段（1〜9） */
  range: number[];
  order: Order;
}

/** 「dan × multiplier」の1問。dan が「何の段」にあたる */
export interface Question {
  dan: number;
  multiplier: number;
}

export interface AnswerLog {
  dan: number;
  multiplier: number;
  userAnswer: number;
  correct: boolean;
  /** 問題が表示されてから回答するまでの秒数 */
  seconds: number;
}

/** localStorage に保存する1回分の記録 */
export interface QuizRecord {
  id: string;
  /** 実施日時（ISO 8601） */
  date: string;
  range: number[];
  order: Order;
  questionCount: number;
  correctCount: number;
  durationSeconds: number;
  answers: AnswerLog[];
  /** 「まちがえた問題だけ もういちど」で行った練習のとき 'retry'（通常の練習は未設定） */
  mode?: 'retry';
}
