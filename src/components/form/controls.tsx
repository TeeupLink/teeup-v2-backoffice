import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// 입력 상태 스타일: 디자인스타일가이드 6.2
export const fieldCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-500';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...p }, ref) {
  return <input ref={ref} className={cn(fieldCls, 'h-9', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...p }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(fieldCls, 'py-2', className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }>(
  function Select({ className, options, placeholder, ...p }, ref) {
    return (
      <select ref={ref} className={cn(fieldCls, 'h-9 pr-8', className)} {...p}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
);

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }>(function Checkbox({ label, className, ...p }, ref) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
      <input ref={ref} type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-primary-800" {...p} />
      {label}
    </label>
  );
});
