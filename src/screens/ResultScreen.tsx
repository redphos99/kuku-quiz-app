import type { QuizRecord, Stage } from '../types';
import { accuracyPercent, formatDuration, missedQuestions, slowestCorrect } from '../quiz';
import { stageLabel } from '../stages';
import { AnswerReview } from '../components/AnswerReview';

/** ステップれんしゅうの結果 */
export interface StageOutcome {
  stage: Stage;
  cleared: boolean;
  /** はじめてのクリアか */
  firstClear: boolean;
  /** 次のステージ（クリアして、次が解放されているときだけ） */
  next?: Stage;
}

interface ResultScreenProps {
  record: QuizRecord;
  /** 記録の保存に成功したか */
  saved: boolean;
  /** ステップれんしゅうのときのクリア判定 */
  outcome?: StageOutcome;
  /** 同じ設定で（まちがえ直しのときは同じ問題で）もういちど */
  onRetry: () => void;
  /** まちがえた問題だけで練習する */
  onRetryMissed: () => void;
  /** 次のステージへ（次がないか、まだ解放されていないときは未指定） */
  onNextStage?: () => void;
  backLabel: string;
  onBack: () => void;
  onShowHistory: () => void;
}

function messageFor(percent: number): { icon: string; text: string } {
  if (percent === 100) return { icon: '🎉', text: 'ぜんぶ せいかい！ すごい！' };
  if (percent >= 80) return { icon: '🌟', text: 'よくできました！' };
  if (percent >= 50) return { icon: '👍', text: 'いいちょうし！ もういちど やってみよう' };
  return { icon: '🌱', text: 'れんしゅうすると どんどん できるようになるよ！' };
}

function stageMessageFor(
  outcome: StageOutcome,
  record: QuizRecord,
  percent: number,
): { icon: string; text: string } {
  if (outcome.cleared) {
    return outcome.firstClear
      ? { icon: '🏆', text: 'クリア！ おめでとう！' }
      : { icon: '⭐', text: 'クリア！ さすが！' };
  }
  if (percent === 100) {
    const over = record.durationSeconds - outcome.stage.targetSeconds;
    return { icon: '⏱️', text: `ぜんぶ せいかい！ あと ${over}秒 はやければ クリア！` };
  }
  return messageFor(percent);
}

export function ResultScreen({
  record,
  saved,
  outcome,
  onRetry,
  onRetryMissed,
  onNextStage,
  backLabel,
  onBack,
  onShowHistory,
}: ResultScreenProps) {
  const total = record.questionCount;
  const wrongCount = total - record.correctCount;
  const percent = accuracyPercent(record.correctCount, total);
  const message = outcome ? stageMessageFor(outcome, record, percent) : messageFor(percent);
  const missedCount = missedQuestions(record.answers).length;
  const isRetry = record.mode === 'retry';
  // まちがえ直しの結果では時間がかかった問題を出さない
  const hasReview = missedCount > 0 || (!isRetry && slowestCorrect(record.answers).length > 0);

  return (
    <main className="screen result">
      <header className="result-hero">
        <div className="result-icon" aria-hidden="true">
          {message.icon}
        </div>
        {isRetry && <p className="result-tag">まちがえた もんだいの やりなおし</p>}
        {outcome && <p className="result-tag">{stageLabel(outcome.stage)}</p>}
        <h1>{message.text}</h1>
        <p className="result-score">
          <strong>{record.correctCount}</strong>
          <span> / {total}もん せいかい</span>
        </p>
      </header>

      {outcome && (
        <div className={'clear-box' + (outcome.cleared ? ' is-cleared' : '')}>
          <p>
            もくひょう <strong>{formatDuration(outcome.stage.targetSeconds)}</strong> ／ きょう{' '}
            <strong>{formatDuration(record.durationSeconds)}</strong>
          </p>
          {!outcome.cleared && (
            <p className="clear-hint">ぜんぶ せいかいで、もくひょうの じかんより はやければ クリアだよ</p>
          )}
        </div>
      )}

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
          <AnswerReview answers={record.answers} showSlow={!isRetry} />
        </div>
      )}

      {!saved && (
        <p className="notice" role="alert">
          このブラウザでは きろくを ほぞんできませんでした。
        </p>
      )}

      <div className="result-actions">
        {onNextStage && (
          <button type="button" className="btn btn-primary btn-big" onClick={onNextStage}>
            つぎの ステージへ
          </button>
        )}
        {missedCount > 0 && (
          <button type="button" className="btn btn-primary btn-big btn-wrap" onClick={onRetryMissed}>
            まちがえた もんだいだけ
            <br />
            もういちど（{missedCount}もん）
          </button>
        )}
        <button
          type="button"
          className={
            missedCount > 0 || onNextStage ? 'btn btn-secondary' : 'btn btn-primary btn-big'
          }
          onClick={onRetry}
        >
          {isRetry ? 'おなじ もんだいで もういちど' : 'もういちど'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {backLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onShowHistory}>
          きろくを みる
        </button>
      </div>
    </main>
  );
}
