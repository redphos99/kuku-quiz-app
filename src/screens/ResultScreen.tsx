import type { QuizRecord } from '../types';
import { accuracyPercent, formatDuration } from '../quiz';

interface ResultScreenProps {
  record: QuizRecord;
  /** 記録の保存に成功したか */
  saved: boolean;
  onRetry: () => void;
  onBack: () => void;
  onShowHistory: () => void;
}

function messageFor(percent: number): { icon: string; text: string } {
  if (percent === 100) return { icon: '🎉', text: 'ぜんぶ せいかい！ すごい！' };
  if (percent >= 80) return { icon: '🌟', text: 'よくできました！' };
  if (percent >= 50) return { icon: '👍', text: 'いいちょうし！ もういちど やってみよう' };
  return { icon: '🌱', text: 'れんしゅうすると どんどん できるようになるよ！' };
}

export function ResultScreen({ record, saved, onRetry, onBack, onShowHistory }: ResultScreenProps) {
  const total = record.questionCount;
  const wrongCount = total - record.correctCount;
  const percent = accuracyPercent(record.correctCount, total);
  const message = messageFor(percent);
  const missed = record.answers.filter((a) => !a.correct);

  return (
    <main className="screen result">
      <header className="result-hero">
        <div className="result-icon" aria-hidden="true">
          {message.icon}
        </div>
        <h1>{message.text}</h1>
        <p className="result-score">
          <strong>{record.correctCount}</strong>
          <span> / {total}もん せいかい</span>
        </p>
      </header>

      <dl className="stats">
        <div className="stat">
          <dt>せいかい</dt>
          <dd>{record.correctCount}もん</dd>
        </div>
        <div className="stat">
          <dt>まちがい</dt>
          <dd>{wrongCount}もん</dd>
        </div>
        <div className="stat">
          <dt>せいかいりつ</dt>
          <dd>{percent}%</dd>
        </div>
        <div className="stat">
          <dt>かかったじかん</dt>
          <dd>{formatDuration(record.durationSeconds)}</dd>
        </div>
      </dl>

      {missed.length > 0 && (
        <section className="panel" aria-labelledby="missed-heading">
          <h2 id="missed-heading">もういちど かくにんしよう</h2>
          <ul className="missed-list">
            {missed.map((a, i) => (
              <li key={i}>
                <span className="missed-q">
                  {a.dan} × {a.multiplier} = <strong>{a.dan * a.multiplier}</strong>
                </span>
                <span className="missed-a">（きみの こたえ: {a.userAnswer}）</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!saved && (
        <p className="notice" role="alert">
          このブラウザでは きろくを ほぞんできませんでした。
        </p>
      )}

      <div className="result-actions">
        <button type="button" className="btn btn-primary btn-big" onClick={onRetry}>
          もういちど
        </button>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          せっていにもどる
        </button>
        <button type="button" className="btn btn-ghost" onClick={onShowHistory}>
          きろくを みる
        </button>
      </div>
    </main>
  );
}
