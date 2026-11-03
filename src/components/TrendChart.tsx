import { useState } from 'react';

export interface TrendPoint {
  label: string;
  /** 値がない週は undefined（線をつなげない） */
  value: number | undefined;
  /** タップしたときに添える説明（「48もん」など） */
  note?: string;
}

interface TrendChartProps {
  title: string;
  points: readonly TrendPoint[];
  /** 縦軸の範囲 [下, 上] */
  domain: readonly [number, number];
  /** 目盛り線を引く値 */
  ticks: readonly number[];
  format: (value: number) => string;
  /** 目盛りの書き方（省略時は format） */
  formatTick?: (value: number) => string;
}

const WIDTH = 320;
const HEIGHT = 150;
const PAD = { top: 12, right: 14, bottom: 24, left: 40 };

/** 週ごとの推移を表す折れ線グラフ。点をタップすると、その週の値を上に表示する */
export function TrendChart({ title, points, domain, ticks, format, formatTick = format }: TrendChartProps) {
  const [selected, setSelected] = useState(points.length - 1);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + (points.length > 1 ? i * step : plotW / 2);
  const y = (v: number) => {
    const [lo, hi] = domain;
    const t = (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo || 1);
    return PAD.top + plotH * (1 - t);
  };

  // 値のない週で線を切る
  const segments: string[] = [];
  let current: string[] = [];
  points.forEach((p, i) => {
    if (p.value === undefined) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
    } else {
      current.push(`${x(i)},${y(p.value)}`);
    }
  });
  if (current.length > 1) segments.push(current.join(' '));

  const sel = points[selected];
  // 目盛りの文字が重ならないよう、多いときは間引く
  const labelEvery = Math.ceil(points.length / 6);

  return (
    <figure className="trend">
      <figcaption className="trend-head">
        <span className="trend-title">{title}</span>
        {sel && (
          <span className="trend-value" aria-live="polite">
            {sel.label}の しゅう：<strong>{sel.value === undefined ? '-' : format(sel.value)}</strong>
            {sel.note && <small>（{sel.note}）</small>}
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="trend-svg" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="trend-grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="trend-axis" x={PAD.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {points.map(
          (p, i) =>
            (i % labelEvery === 0 || i === points.length - 1) && (
              <text key={i} className="trend-axis" x={x(i)} y={HEIGHT - 6} textAnchor="middle">
                {p.label}
              </text>
            ),
        )}
        {segments.map((s) => (
          <polyline key={s} className="trend-line" points={s} />
        ))}
        {points.map(
          (p, i) =>
            p.value !== undefined && (
              <circle
                key={i}
                className={'trend-dot' + (i === selected ? ' is-selected' : '')}
                cx={x(i)}
                cy={y(p.value)}
                r={i === selected ? 6 : 4}
              />
            ),
        )}
        {/* 点より広い、タップしやすい当たり判定 */}
        {points.map((p, i) => (
          <rect
            key={i}
            className="trend-hit"
            x={x(i) - Math.max(step, 24) / 2}
            y={PAD.top}
            width={Math.max(step, 24)}
            height={plotH}
            onClick={() => setSelected(i)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setSelected(i)}
          >
            <title>{`${p.label}の しゅう：${p.value === undefined ? '-' : format(p.value)}`}</title>
          </rect>
        ))}
      </svg>
    </figure>
  );
}
