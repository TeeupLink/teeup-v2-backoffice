export type ToastTone = 'success' | 'error' | 'info';
export type ToastItem = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(items));
}

export function subscribe(l: Listener) {
  listeners.add(l);
  l(items);
  return () => {
    listeners.delete(l);
  };
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(tone: ToastTone, title: string, extra: Omit<ToastItem, 'id' | 'tone' | 'title'> = {}) {
  const id = ++seq;
  items = [...items.slice(-3), { id, tone, title, ...extra }];
  emit();
  return id;
}

/** 작업 결과 알림 (REQ-011). 화면 어디서든 호출 */
export const toast = {
  success: (title: string, extra?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('success', title, extra),
  error: (title: string, extra?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('error', title, extra),
  info: (title: string, extra?: Omit<ToastItem, 'id' | 'tone' | 'title'>) => push('info', title, extra),
};
