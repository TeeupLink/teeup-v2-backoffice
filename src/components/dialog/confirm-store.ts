export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
  /** 사유 입력. required 면 공백 불가 */
  reason?: { label?: string; placeholder?: string; required?: boolean };
};

/** 취소 = null, 확인 = { reason } */
export type ConfirmResult = { reason: string } | null;

type Pending = ConfirmOptions & { resolve: (r: ConfirmResult) => void };
type Listener = (p: Pending | null) => void;

let current: Pending | null = null;
const listeners = new Set<Listener>();

export function subscribeConfirm(l: Listener) {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}

function set(p: Pending | null) {
  current = p;
  listeners.forEach((l) => l(p));
}

/**
 * 파괴적 작업 확인 (REQ-008). window.confirm 대신 쓴다.
 * const r = await confirm({ title: '삭제할까요?', tone: 'danger', reason: { required: true } });
 * if (!r) return;
 */
export function confirm(opts: ConfirmOptions): Promise<ConfirmResult> {
  current?.resolve(null);
  return new Promise((resolve) => set({ ...opts, resolve }));
}

export function settleConfirm(result: ConfirmResult) {
  const p = current;
  set(null);
  p?.resolve(result);
}
