import { useSyncExternalStore } from 'react';
import { formatPII, maskMode } from './pii';

/** 마스킹 모드 변경 시 다시 그려지는 포맷터 */
export function usePII() {
  const on = useSyncExternalStore(maskMode.subscribe, maskMode.get, maskMode.get);
  return {
    masked: on,
    name: (v: string | null | undefined) => formatPII('name', v, on),
    phone: (v: string | null | undefined) => formatPII('phone', v, on),
    email: (v: string | null | undefined) => formatPII('email', v, on),
  };
}
