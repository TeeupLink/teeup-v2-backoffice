import { useId, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useUnsavedGuard } from './useUnsavedGuard';

/** 섹션 카드 (화면설계서 3.2 PTN-FORM) */
export function FormSection({ title, description, id, children }: { title: string; description?: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

/**
 * 라벨 + 컨트롤 + 에러. 라벨은 데스크톱에서 왼쪽 160px, 모바일에서 위. stacked 면 항상 위 (좁은 패널·모달).
 * children 은 (id, invalid) 를 받아 컨트롤을 그린다 — 라벨·aria 연결을 빠뜨리지 않기 위함.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  stacked,
  children,
}: {
  label: string;
  stacked?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (ctl: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cn('grid gap-1.5', !stacked && 'md:grid-cols-[160px_1fr] md:gap-4')}>
      <label htmlFor={id} className={cn('text-sm font-medium text-slate-700', !stacked && 'pt-2')}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <div className="min-w-0">
        {children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? msgId : undefined })}
        {error ? (
          <p id={msgId} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : hint ? (
          <p id={msgId} className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type FormShellProps = {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  dirty: boolean;
  submitText?: string;
  onCancel?: () => void;
  /** 매핑되지 않은 서버 에러 */
  error?: string | null;
  /** 수정 화면에서 변경 없으면 저장 비활성 */
  requireDirty?: boolean;
  children: ReactNode;
  className?: string;
};

/** 폼 바깥 틀: 상단 에러 배너 + 섹션들 + 하단 고정 저장 바 */
export function FormShell({ onSubmit, submitting, dirty, submitText = '저장', onCancel, error, requireDirty, children, className }: FormShellProps) {
  useUnsavedGuard(dirty && !submitting);
  return (
    <form onSubmit={onSubmit} noValidate className={cn('space-y-4', className)}>
      {error && (
        <div role="alert" className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {children}
      {/* 본문 스크롤 영역 하단에 붙는다 — 사이드바 접힘 여부와 무관 */}
      <div className="sticky bottom-0 z-[70] -mx-4 -mb-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:-mb-6 lg:px-6">
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              취소
            </Button>
          )}
          <Button type="submit" variant="primary" loading={submitting} disabled={requireDirty && !dirty}>
            {submitText}
          </Button>
        </div>
      </div>
    </form>
  );
}
