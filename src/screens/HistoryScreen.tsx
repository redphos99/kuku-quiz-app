import { useState } from 'react';
import { loadRecords } from '../storage';
import { ORDER_LABELS, accuracyPercent, formatDate, formatDuration, formatRange } from '../quiz';
import { AnswerReview } from '../components/AnswerReview';

interface HistoryScreenProps {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const [records] = useState(loadRecords); // 新しい順
  const [openId, setOpenId] = useState<string | null>(null);

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
            const open = openId === r.id;
            const detailId = `history-detail-${r.id}`;
            return (
              <li key={r.id} className={'history-item' + (perfect ? ' is-perfect' : '')}>
                <button
                  type="button"
                  className="history-row"
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <div className="history-score">
                    <strong>{r.correctCount}</strong>
                    <span>/ {r.questionCount}もん</span>
                  </div>
                  <div className="history-main">
                    <div className="history-line">
                      <span className="history-date">{formatDate(r.date)}</span>
                      {r.mode === 'retry' && <span className="badge badge-retry">やりなおし</span>}
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
                  <span className="history-chevron" aria-hidden="true">
                    {open ? '▲' : '▼'}
                  </span>
                </button>
                {open && (
                  <div id={detailId} className="history-detail">
                    <AnswerReview
                      answers={r.answers}
                      showNoMissMessage
                      showSlow={r.mode !== 'retry'}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
