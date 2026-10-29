import { sanitizeHtml } from '@/lib/sanitize';

export function RichTextView({ html }: { html: string | null | undefined }) {
  if (!html) return <p className="text-sm text-slate-400">내용 없음</p>;
  return <div className="rt-content text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
