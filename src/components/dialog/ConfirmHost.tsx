import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { settleConfirm, subscribeConfirm, type ConfirmOptions } from './confirm-store';

/** 앱에 한 번만 둔다. confirm() 호출을 받아 대화상자를 띄운다 */
export function ConfirmHost() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const reasonId = useId();

  useEffect(
    () =>
      subscribeConfirm((p) => {
        setOpts(p);
        setReason('');
        setTouched(false);
      }),
    [],
  );

  const reasonMissing = !!opts?.reason?.required && reason.trim() === '';
  const submit = () => {
    setTouched(true);
    if (reasonMissing) return;
    settleConfirm({ reason: reason.trim() });
  };

  return (
    <AlertDialog.Root open={!!opts} onOpenChange={(o) => !o && settleConfirm(null)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[150] bg-slate-900/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[151] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          {opts && (
            <>
              <AlertDialog.Title className="text-lg font-semibold text-slate-900">{opts.title}</AlertDialog.Title>
              <AlertDialog.Description className={opts.description ? 'mt-2 text-sm text-slate-600' : 'sr-only'}>
                {opts.description ?? opts.title}
              </AlertDialog.Description>
              {opts.reason && (
                <div className="mt-4">
                  <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-slate-700">
                    {opts.reason.label ?? '사유'}
                    {opts.reason.required && <span className="text-red-600"> *</span>}
                  </label>
                  <textarea
                    id={reasonId}
                    value={reason}
                    maxLength={500}
                    rows={3}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={opts.reason.placeholder}
                    aria-invalid={touched && reasonMissing}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 aria-[invalid=true]:border-red-500"
                  />
                  {touched && reasonMissing && <p className="mt-1 text-xs text-red-600">사유를 입력해주세요</p>}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button>{opts.cancelText ?? '취소'}</Button>
                </AlertDialog.Cancel>
                <Button variant={opts.tone === 'danger' ? 'danger' : 'primary'} onClick={submit}>
                  {opts.confirmText ?? '확인'}
                </Button>
              </div>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
