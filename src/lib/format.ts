/** 날짜·금액 표시 (화면설계서 3.1: 날짜 YYYY-MM-DD, 일시 YYYY-MM-DD HH:mm, 금액 1,000원) */
function parse(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(v: string | Date | null | undefined): string {
  const d = parse(v);
  return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '-';
}

export function formatDateTime(v: string | Date | null | undefined): string {
  const d = parse(v);
  return d ? `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
}

export function formatWon(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '-';
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString('ko-KR')}원` : '-';
}

export function formatNumber(v: number | null | undefined): string {
  return v === null || v === undefined ? '-' : v.toLocaleString('ko-KR');
}

/** "3시간 전" — 문의 경과 시간 등 */
export function elapsedHours(v: string | Date | null | undefined, now = new Date()): number | null {
  const d = parse(v);
  return d ? (now.getTime() - d.getTime()) / 3_600_000 : null;
}
