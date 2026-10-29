import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function StatusPage({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon className="h-10 w-10 text-slate-300" aria-hidden />
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {description && <p className="max-w-md text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
