import { useState } from 'react';
import type { Order, QuizSettings } from '../types';
import {
  COUNT_PRESETS,
  DANS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  ORDER_LABELS,
  formatRange,
  poolSize,
} from '../quiz';
import { loadSettings, saveSettings } from '../storage';

interface SettingsScreenProps {
  onStart: (settings: QuizSettings) => void;
  onShowHistory: () => void;
}

const ORDERS: Order[] = ['asc', 'desc', 'random'];

function parseCustomCount(text: string): number | null {
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= MIN_QUESTIONS && n <= MAX_QUESTIONS ? n : null;
}

export function SettingsScreen({ onStart, onShowHistory }: SettingsScreenProps) {
  // 前回の設定を引き継ぐ（何度も同じ設定で練習しやすくするため）
  const [initial] = useState(loadSettings);
  const [customMode, setCustomMode] = useState(
    !(COUNT_PRESETS as readonly number[]).includes(initial.questionCount),
  );
  const [presetCount, setPresetCount] = useState(
    (COUNT_PRESETS as readonly number[]).includes(initial.questionCount)
      ? initial.questionCount
      : 10,
  );
  const [customText, setCustomText] = useState(String(initial.questionCount));
  const [range, setRange] = useState<number[]>(initial.range);
  const [order, setOrder] = useState<Order>(initial.order);

  const questionCount = customMode ? parseCustomCount(customText) : presetCount;
  const canStart = questionCount !== null && range.length > 0;
  const total = poolSize(range);

  const toggleDan = (dan: number) =>
    setRange((prev) =>
      prev.includes(dan) ? prev.filter((d) => d !== dan) : [...prev, dan].sort((a, b) => a - b),
    );

  const start = () => {
    if (!canStart || questionCount === null) return;
    const settings: QuizSettings = { questionCount, range, order };
    saveSettings(settings);
    onStart(settings);
  };

  return (
    <main className="screen settings">
      <header className="top-bar">
        <h1 className="app-title">
          <span className="app-title-mark" aria-hidden="true">
            ×
          </span>
          くくれんしゅう
        </h1>
        <button type="button" className="btn btn-ghost btn-small" onClick={onShowHistory}>
          きろく
        </button>
      </header>

      <section className="panel" aria-labelledby="count-heading">
        <h2 id="count-heading">なんもん やる？</h2>
        <div className="chip-row">
          {COUNT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={!customMode && presetCount === n}
              onClick={() => {
                setCustomMode(false);
                setPresetCount(n);
              }}
            >
              {n}もん
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={customMode}
            onClick={() => setCustomMode(true)}
          >
            じぶんで
          </button>
        </div>
        {customMode && (
          <div className="custom-count">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              className="custom-input"
              value={customText}
              aria-label="もんだいのかず"
              aria-invalid={questionCount === null}
              onChange={(e) => setCustomText(e.target.value.replace(/[^\d]/g, ''))}
            />
            <span>もん</span>
            <span className={questionCount === null ? 'hint hint-warn' : 'hint'}>
              {MIN_QUESTIONS}〜{MAX_QUESTIONS}の かずを いれてね
            </span>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="range-heading">
        <div className="panel-head">
          <h2 id="range-heading">なんのだん？</h2>
          <div className="mini-actions">
            <button type="button" className="link-btn" onClick={() => setRange([...DANS])}>
              ぜんぶ
            </button>
            <button type="button" className="link-btn" onClick={() => setRange([])}>
              ぜんぶけす
            </button>
          </div>
        </div>
        <div className="dan-grid">
          {DANS.map((dan) => (
            <button
              key={dan}
              type="button"
              className="dan-btn"
              aria-label={`${dan}のだん`}
              aria-pressed={range.includes(dan)}
              onClick={() => toggleDan(dan)}
            >
              <span className="dan-num">{dan}</span>
              <span className="dan-unit">のだん</span>
            </button>
          ))}
        </div>
        <p className={range.length === 0 ? 'hint hint-warn' : 'hint'} aria-live="polite">
          {range.length === 0
            ? 'だんを 1つ以上 えらんでね'
            : `${formatRange(range)}（ぜんぶで ${total}もん）`}
          {questionCount !== null && questionCount > total && range.length > 0
            ? ' ／ おなじもんだいが でることがあるよ'
            : ''}
        </p>
      </section>

      <section className="panel" aria-labelledby="order-heading">
        <h2 id="order-heading">じゅんばん</h2>
        <div className="order-list" role="radiogroup" aria-labelledby="order-heading">
          {ORDERS.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              className="order-btn"
              aria-checked={order === o}
              onClick={() => setOrder(o)}
            >
              {ORDER_LABELS[o]}
            </button>
          ))}
        </div>
      </section>

      <div className="bottom-bar">
        <button type="button" className="btn btn-primary btn-big" disabled={!canStart} onClick={start}>
          スタート！
        </button>
      </div>
    </main>
  );
}
