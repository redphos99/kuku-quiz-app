import type { QuizRecord } from '../types';
import { accuracyPercent, formatDuration, missedQuestions } from '../quiz';
import { AnswerReview } from '../components/AnswerReview';

interface ResultScreenProps {
  record: QuizRecord;
  /** 記録の保存に成功したか */
  saved: boolean;
  /** 同じ設定で（まちがえ直しのときは同じ問題で）もういちど */
  onRetry: () => void;
  /** まちがえた問題だけで練習する */
  onRetryMissed: () => void;
  onBack: () => void;
  onShowHistory: () => void;
}

function messageFor(percent: number): { icon: string; text: string } {
  if (percent === 100) return { icon: '🎉', text: 'ぜんぶ せいかい！ すごい！' };
  if (percent >= 80) return { icon: '🌟', text: 'よくできました！' };
  if (percent >= 50) return { icon: '👍', text: 'いいちょうし！ もういちど やってみよう' };
  return { icon: '🌱', text: 'れんしゅうすると どんどん できるようになるよ！' };
}

export function ResultScreen({
  record,
  saved,
  onRetry,
  onRetryMissed,
  onBack,
  onShowHistory,
}: ResultScreenProps) {
  const total = record.questionCount;
  const wrongCount = total - record.correctCount;
  const percent = accuracyPercent(record.correctCount, total);
  const message = messageFor(percent);
  const missedCount = missedQuestions(record.answers).length;
  const isRetry = record.mode === 'retry';
  const hasReview = record.answers.length > 0;

  return (
    <main className="screen result">
      <header className="result-hero">
        <div className="result-icon" aria-hidden="true">
          {message.icon}
        </div>
        {isRetry && <p className="result-tag">まちがえた もんだいの やりなおし</p>}
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

      {hasReview && (
        <div className="panel review-panel">
          <AnswerReview answers={record.answers} />
        </div>
      )}

      {!saved && (
        <p className="notice" role="alert">
          このブラウザでは きろくを ほぞんできませんでした。
        </p>
      )}

      <div className="result-actions">
        {missedCount > 0 && (
          <button type="button" className="btn btn-primary btn-big btn-wrap" onClick={onRetryMissed}>
            まちがえた もんだいだけ
            <br />
            もういちど（{missedCount}もん）
          </button>
        )}
        <button
          type="button"
          className={missedCount > 0 ? 'btn btn-secondary' : 'btn btn-primary btn-big'}
          onClick={onRetry}
        >
          {isRetry ? 'おなじ もんだいで もういちど' : 'もういちど'}
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
