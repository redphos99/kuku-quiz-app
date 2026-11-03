import { useMemo, useState } from 'react';
import { DANS, formatSeconds } from '../quiz';
import {
  RECENT_ATTEMPTS,
  accuracyLevel,
  commonMistakes,
  formatWeek,
  problemStats,
  speedLevel,
  weeklyTrend,
  type ProblemStat,
} from '../analysis';
import { loadRecords } from '../storage';
import { TrendChart } from '../components/TrendChart';

interface AnalysisScreenProps {
  onBack: () => void;
}

type MapMode = 'accuracy' | 'speed';

const MAP_MODES: { mode: MapMode; label: string; hint: string }[] = [
  { mode: 'accuracy', label: 'まちがい', hint: 'まちがえた かいすうが おおいほど こい いろ' },
  { mode: 'speed', label: 'はやさ', hint: 'こたえるのに じかんが かかるほど こい いろ' },
];

function describe(stat: ProblemStat): string {
  if (stat.attempts === 0) return 'まだ でて いないよ';
  const time = stat.avgSeconds === undefined ? '' : `・へいきん ${formatSeconds(stat.avgSeconds)}`;
  return `${stat.attempts}かい ちゅう ${stat.correct}かい せいかい${time}`;
}

export function AnalysisScreen({ onBack }: AnalysisScreenProps) {
  const [records] = useState(loadRecords);
  const stats = useMemo(() => problemStats(records), [records]);
  const mistakes = useMemo(() => commonMistakes(records), [records]);
  const weeks = useMemo(() => weeklyTrend(records), [records]);
  const [mode, setMode] = useState<MapMode>('accuracy');
  const [selected, setSelected] = useState<ProblemStat | null>(null);

  const levelOf = mode === 'accuracy' ? accuracyLevel : speedLevel;
  const hasData = weeks.length > 0;
  const accuracy = weeks.map((w) => ({
    label: formatWeek(w.weekStart),
    value: (w.correct / w.questions) * 100,
    note: `${w.questions}もん`,
  }));
  const speed = weeks.map((w) => ({
    label: formatWeek(w.weekStart),
    value: w.avgSeconds,
    note: `せいかい ${w.correct}もん`,
  }));
  const minAccuracy = Math.min(...accuracy.map((p) => p.value));
  const accuracyFloor = Math.min(50, Math.floor(minAccuracy / 10) * 10);
  const maxSeconds = Math.max(4, ...speed.map((p) => p.value ?? 0));
  const secondsCeil = Math.ceil(maxSeconds / 2) * 2;

  return (
    <main className="screen analysis">
      <header className="top-bar">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ← もどる
        </button>
        <h1 className="page-title">ぶんせき</h1>
        <span className="top-bar-spacer" aria-hidden="true" />
      </header>

      {!hasData ? (
        <p className="empty">
          まだ きろくが ないよ。
          <br />
          れんしゅうすると ここで にがてや のびが わかるよ！
        </p>
      ) : (
        <>
          <section className="panel" aria-labelledby="heatmap-heading">
            <h2 id="heatmap-heading">にがてマップ</h2>
            <div className="chip-row" role="group" aria-label="マップの みかた">
              {MAP_MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  className="chip"
                  aria-pressed={mode === m.mode}
                  onClick={() => setMode(m.mode)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="hint">
              さいきん {RECENT_ATTEMPTS}かいの こたえから。
              {MAP_MODES.find((m) => m.mode === mode)!.hint}。マスを タップすると くわしく みられるよ
            </p>

            <div className="heatmap" role="group" aria-label="にがてマップ（たて: だん、よこ: かける かず）">
              <span className="heatmap-corner" aria-hidden="true">
                ×
              </span>
              {DANS.map((m) => (
                <span key={m} className="heatmap-head" aria-hidden="true">
                  {m}
                </span>
              ))}
              {stats.map((row, i) => (
                <div key={DANS[i]} className="heatmap-row">
                  <span className="heatmap-head" aria-hidden="true">
                    {DANS[i]}
                  </span>
                  {row.map((s) => {
                    const level = levelOf(s);
                    const isSelected = selected?.dan === s.dan && selected.multiplier === s.multiplier;
                    return (
                      <button
                        key={s.multiplier}
                        type="button"
                        className={
                          'heatmap-cell' +
                          (level === undefined ? ' is-empty' : ` heat-${level}`) +
                          (isSelected ? ' is-selected' : '')
                        }
                        aria-label={`${s.dan} かける ${s.multiplier}（${describe(s)}）`}
                        aria-pressed={isSelected}
                        onClick={() => setSelected(isSelected ? null : s)}
                      >
                        {s.dan * s.multiplier}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="heatmap-legend" aria-hidden="true">
              <span>とくい</span>
              {([0, 1, 2, 3, 4] as const).map((l) => (
                <span key={l} className={`heatmap-swatch heat-${l}`} />
              ))}
              <span>にがて</span>
              <span className="heatmap-swatch is-empty" />
              <span>まだ</span>
            </div>

            <p className="heatmap-detail" aria-live="polite">
              {selected ? (
                <>
                  <strong>
                    {selected.dan} × {selected.multiplier} = {selected.dan * selected.multiplier}
                  </strong>
                  ：{describe(selected)}
                </>
              ) : (
                'マスを えらんでね'
              )}
            </p>
          </section>

          <section className="panel" aria-labelledby="mistakes-heading">
            <h2 id="mistakes-heading">よくある まちがい</h2>
            {mistakes.length === 0 ? (
              <p className="review-empty">まちがいは まだ ないよ！</p>
            ) : (
              <ol className="review-list mistake-list">
                {mistakes.map((m) => (
                  <li key={`${m.dan}x${m.multiplier}=${m.userAnswer}`}>
                    <span className="review-q">
                      {m.dan} × {m.multiplier} = <strong>{m.dan * m.multiplier}</strong>
                    </span>
                    <span className="review-note">
                      {m.userAnswer} と こたえた（{m.count}かい）
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel" aria-labelledby="trend-heading">
            <h2 id="trend-heading">のびの ようす</h2>
            <p className="hint">
              1しゅうかん ごとの せいせき（さいきん {weeks.length}しゅう）。
              {weeks.length < 2 && 'もっと れんしゅうすると のびが わかるよ。'}
              てんを タップすると その しゅうの ようすが みられるよ
            </p>
            <TrendChart
              title="せいかいりつ"
              points={accuracy}
              domain={[accuracyFloor, 100]}
              ticks={[accuracyFloor, (accuracyFloor + 100) / 2, 100]}
              format={(v) => `${Math.round(v)}%`}
            />
            <TrendChart
              title="1もんに かかった じかん（せいかいの とき）"
              points={speed}
              domain={[0, secondsCeil]}
              ticks={[0, secondsCeil / 2, secondsCeil]}
              format={formatSeconds}
              formatTick={(v) => `${v}秒`}
            />
          </section>
        </>
      )}
    </main>
  );
}
