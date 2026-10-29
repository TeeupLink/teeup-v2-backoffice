import { Eye, EyeOff } from 'lucide-react';
import { maskMode } from '@/lib/pii';
import { usePII } from '@/lib/usePII';
import { cn } from '@/lib/cn';

// 개인정보 마스킹 토글 (F-131). 기본 꺼짐, 이 브라우저에 기억. 켜면 전 화면의 이름·전화·이메일이 가려진다 (입력칸은 제외)
export function MaskToggle() {
  const { masked } = usePII();
  return (
    <button
      type="button"
      aria-pressed={masked}
      onClick={() => maskMode.set(!masked)}
      title={masked ? '개인정보 마스킹 끄기' : '개인정보 마스킹 켜기 (화면 공유·캡처 전에)'}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        masked ? 'bg-secondary-50 font-medium text-amber-800 ring-1 ring-secondary-300' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {masked ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      <span className={cn(!masked && 'sr-only lg:not-sr-only')}>{masked ? '마스킹 중' : '마스킹'}</span>
    </button>
  );
}
