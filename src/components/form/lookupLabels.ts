export type LookupKind = 'clubs' | 'users';

// 선택한 항목의 이름을 기억한다 (URL 에는 id 만 남으므로 칩·버튼 표시용)
const labelCache = new Map<string, string>();
const cacheKey = (kind: LookupKind, value: string) => `${kind}:${value}`;

export function lookupLabel(kind: LookupKind, value: string): string {
  return labelCache.get(cacheKey(kind, value)) ?? `${kind === 'clubs' ? '클럽' : '회원'} #${value}`;
}

export function rememberLabel(kind: LookupKind, value: string, label: string) {
  labelCache.set(cacheKey(kind, value), label);
}
