import { useState } from 'react';
import { loadRecords } from '../storage';
import { ORDER_LABELS, accuracyPercent, formatDate, formatDuration, formatRange } from '../quiz';

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [records] = useState(loadRecords); // 新しい順

  return (
    <main className="screen history">
      <header className="top-bar">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← もどる
        </button>
        <h1 className="page-title">きろく</h1>
        <span className="top-bar-spacer" aria-hidden="true" />
      </header>

      {records.length === 0 ? (
        <p className="empty">
          まだ きろくが ないよ。
          <br />
          れんしゅうすると ここに のこるよ！
        </p>
      ) : (
        <ul className="history-list">
          {records.map((r) => {
            const percent = accuracyPercent(r.correctCount, r.questionCount);
            const perfect = r.correctCount === r.questionCount;
            return (
              <li key={r.id} className={'history-item' + (perfect ? ' is-perfect' : '')}>
                <div className="history-score">
                  <strong>{r.correctCount}</strong>
                  <span>/ {r.questionCount}もん</span>
                </div>
                <div className="history-main">
                  <div className="history-line">
                    <span className="history-date">{formatDate(r.date)}</span>
                    {perfect && <span className="badge">ぜんぶせいかい</span>}
                  </div>
                  <div className="history-meta">
                    <span>せいかいりつ {percent}%</span>
                    <span>じかん {formatDuration(r.durationSeconds)}</span>
                  </div>
                  <div className="history-settings">
                    {formatRange(r.range)} ／ {ORDER_LABELS[r.order]}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
