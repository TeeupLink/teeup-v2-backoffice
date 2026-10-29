import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { confirm } from '@/components/dialog/confirm-store';

/** 저장하지 않고 떠날 때 확인 (F-004) */
export function useUnsavedGuard(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({ title: '저장하지 않은 변경이 있습니다', description: '이 화면을 떠나면 입력한 내용이 사라집니다.', confirmText: '떠나기', tone: 'danger' }).then((r) =>
      r ? blocker.proceed() : blocker.reset(),
    );
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);
}
