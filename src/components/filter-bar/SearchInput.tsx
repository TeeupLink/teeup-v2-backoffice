import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** 텍스트 검색 — 300ms 디바운스 자동 적용 (REQ-003). Enter 는 즉시 적용 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 300,
}: {
  value: string;
  onChange: (v: string, opts: { replace: boolean }) => void;
  placeholder?: string;
  delay?: number;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSent = useRef(value);

  // 뒤로가기 등으로 URL 이 바뀌면 입력값도 따라간다
  useEffect(() => {
    if (value !== lastSent.current) {
      setText(value);
      lastSent.current = value;
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (v: string, replace: boolean) => {
    clearTimeout(timer.current);
    if (v.trim() === lastSent.current.trim()) return;
    lastSent.current = v;
    onChange(v, { replace });
  };

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        type="search"
        value={text}
        aria-label={placeholder ?? '검색'}
        placeholder={placeholder ?? '검색'}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => send(v, true), delay);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send(text, false);
        }}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            setText('');
            send('', false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
