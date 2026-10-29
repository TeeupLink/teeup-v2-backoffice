/** 현재 페이지 주변 번호 + 처음·끝, 사이는 … */
export function pageWindow(page: number, totalPages: number, span = 2): (number | '…')[] {
  if (totalPages <= 1) return [1];
  const out: (number | '…')[] = [];
  const from = Math.max(2, page - span);
  const to = Math.min(totalPages - 1, page + span);
  out.push(1);
  if (from > 2) out.push('…');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}
