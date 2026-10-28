import * as RToast from '@radix-ui/react-toast';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { dismiss, subscribe, type ToastItem } from './toast-store';

const ICON = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-400" aria-hidden />,
  error: <XCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-300" aria-hidden />,
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribe(setItems), []);

  return (
    <RToast.Provider swipeDirection="right" duration={4000}>
      {items.map((t) => (
        <RToast.Root
          key={t.id}
          onOpenChange={(open) => !open && dismiss(t.id)}
          duration={t.tone === 'error' ? 6000 : 4000}
          className="flex items-start gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-xl data-[state=closed]:opacity-0 data-[swipe=end]:translate-x-full"
        >
          {ICON[t.tone]}
          <div className="min-w-0 flex-1">
            <RToast.Title className="font-medium">{t.title}</RToast.Title>
            {t.description && <RToast.Description className="mt-0.5 text-slate-300">{t.description}</RToast.Description>}
          </div>
          {t.action && (
            <RToast.Action altText={t.action.label} onClick={t.action.onClick} className="shrink-0 font-medium text-primary-300 hover:underline">
              {t.action.label}
            </RToast.Action>
          )}
          <RToast.Close aria-label="닫기" className="shrink-0 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </RToast.Close>
        </RToast.Root>
      ))}
      <RToast.Viewport className="fixed bottom-4 right-4 z-[200] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </RToast.Provider>
  );
}
