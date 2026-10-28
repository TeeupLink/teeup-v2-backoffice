/**
 * 로그인 후 돌아갈 경로. 내부 경로만 허용한다 (오픈 리다이렉트 방지, F-012).
 */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.startsWith('/login')) return fallback;
  return next;
}
