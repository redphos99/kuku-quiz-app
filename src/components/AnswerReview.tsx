import { useId } from 'react';
import type { AnswerLog } from '../types';
import { formatSeconds, slowestCorrect } from '../quiz';

interface AnswerReviewProps {
  answers: readonly AnswerLog[];
  /** 間違いが1つもないとき「まちがいは なかったよ」を出すか（記録一覧の詳細用） */
  showNoMissMessage?: boolean;
}

/** 1回分の答えから「まちがえた問題」と「時間がかかった問題（正解のうち上位3つ）」を並べて表示する */
export function AnswerReview({ answers, showNoMissMessage = false }: AnswerReviewProps) {
  const uid = useId();
  const missed = answers.filter((a) => !a.correct);
  const slow = slowestCorrect(answers);

  return (
    <>
      {missed.length > 0 ? (
        <section className="review" aria-labelledby={`${uid}-missed`}>
          <h2 id={`${uid}-missed`}>もういちど かくにんしよう</h2>
          <ul className="review-list review-missed">
            {missed.map((a, i) => (
              <li key={i}>
                <span className="review-q">
                  {a.dan} × {a.multiplier} = <strong>{a.dan * a.multiplier}</strong>
                </span>
                <span className="review-note">（きみの こたえ: {a.userAnswer}）</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        showNoMissMessage && <p className="review-empty">まちがいは なかったよ！</p>
      )}

      {slow.length > 0 && (
        <section className="review" aria-labelledby={`${uid}-slow`}>
          <h2 id={`${uid}-slow`}>じかんが かかった もんだい</h2>
          <p className="review-hint">せいかいしたけど、すこし じかんが かかったよ。</p>
          <ol className="review-list review-slow">
            {slow.map((a, i) => (
              <li key={i}>
                <span className="review-q">
                  {a.dan} × {a.multiplier} = <strong>{a.dan * a.multiplier}</strong>
                </span>
                <span className="review-time">{formatSeconds(a.seconds)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
