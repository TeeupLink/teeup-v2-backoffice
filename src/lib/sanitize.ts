/**
 * 저장된 HTML 표시. 서버가 관리자 입력만 저장하지만, 스크립트·이벤트 속성은 걸러서 그린다.
 */
const BLOCKED = /<\s*(script|iframe|object|embed|style)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|style)[^>]*\/?>/gi;
const EVENT_ATTR = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi;

export function sanitizeHtml(html: string): string {
  return html.replace(BLOCKED, '').replace(EVENT_ATTR, '').replace(JS_URL, '$1="#"');
}
