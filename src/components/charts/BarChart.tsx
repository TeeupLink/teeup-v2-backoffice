import { useId, useState } from 'react';
import { formatNumber } from '@/lib/format';

/**
 * 한 계열 막대 차트 (SVG, 라이브러리 없음). 계열이 하나라 범례 없이 카드 제목이 이름이다.
 * - 값이 null 인 칸은 0 이 아니라 빗금 "데이터 없음"으로 그린다 (REQ-240)
 * - 막대마다 마우스·키보드 포커스로 값 툴팁, 막대보다 넓은 히트 영역
 * - 같은 내용을 표로 볼 수 있다 (색에만 의존하지 않도록)
 */
export type BarPoint = { key: string; label: string; value: number | null };

const H = 160;
const PAD_TOP = 8;

export function BarChart({ data, unit = '', ariaLabel }: { data: BarPoint[]; unit?: string; ariaLabel: string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const n = data.length || 1;
  const W = 600;
  const slot = W / n;
  const bar = Math.max(2, Math.min(28, slot - 2)); // 막대 사이 2px 이상 띄운다
  const y = (v: number) => PAD_TOP + (H - PAD_TOP) * (1 - v / top);
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(n / 8);
  const fmt = (v: number | null) => (v == null ? '데이터 없음' : `${formatNumber(v)}${unit}`);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="text-xs text-slate-500 hover:text-slate-900 hover:underline" onClick={() => setTable((t) => !t)}>
          {table ? '차트로 보기' : '표로 보기'}
        </button>
      </div>
      {table ? (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{ariaLabel}</caption>
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="py-1.5 text-left font-normal text-slate-600">
                    {d.label}
                  </th>
                  <td className="py-1.5 text-right tabular text-slate-900">{fmt(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H + 22}`} className="h-44 w-full overflow-visible" role="img" aria-label={ariaLabel}>
            <defs>
              <pattern id={`${id}-nodata`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" className="fill-slate-50" />
                <line x1="0" y1="0" x2="0" y2="6" className="stroke-slate-200" strokeWidth="2" />
              </pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1="0" x2={W} y1={y(t)} y2={y(t)} className="stroke-slate-100" strokeWidth="1" />
                <text x="0" y={y(t) - 3} className="fill-slate-400 text-[10px]">
                  {formatNumber(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const cx = slot * i + slot / 2;
              const v = d.value;
              const h = v == null ? H - PAD_TOP : Math.max(v > 0 ? 2 : 0, H - y(v));
              return (
                <g
                  key={d.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label} ${fmt(v)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                >
                  <rect x={slot * i} y={0} width={slot} height={H} fill="transparent" />
                  {v == null ? (
                    <rect x={cx - bar / 2} y={PAD_TOP} width={bar} height={h} fill={`url(#${id}-nodata)`} />
                  ) : (
                    <path d={roundedTop(cx - bar / 2, H - h, bar, h, Math.min(4, bar / 2))} className={hover === i ? 'fill-primary-800' : 'fill-primary-600'} />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={H + 15} textAnchor="middle" className="fill-slate-500 text-[10px]">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
            <line x1="0" x2={W} y1={H} y2={H} className="stroke-slate-300" strokeWidth="1" />
          </svg>
          {hover != null && data[hover] && (
            <div
              className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow"
              style={{ left: `${((hover + 0.5) / n) * 100}%` }}
              role="status"
            >
              {data[hover].label} · {fmt(data[hover].value)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 2;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

/** 위쪽 모서리만 둥근 막대 (바닥은 기준선에 붙인다) */
function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return '';
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
