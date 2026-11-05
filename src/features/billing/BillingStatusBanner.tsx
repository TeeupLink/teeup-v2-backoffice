import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/display/StatusBadge';
import { useBillingStatus } from './useBillingStatus';

/** 결제 화면 공통 상단 배너 (화면설계서 4.8) — 정기결제 비활성 / 토스 키 종류 */
export function BillingStatusBanner() {
  const { data } = useBillingStatus();
  if (!data) return null;
  return (
    <div className="mb-3 space-y-2">
      {!data.enabled && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>정기결제 비활성 — 자동 청구와 수동 재청구가 동작하지 않습니다.</span>
          {data.mode === 'test' && <Badge tone="info">테스트 모드</Badge>}
        </div>
      )}
      {data.enabled && data.mode === 'test' && <Badge tone="info">테스트 모드</Badge>}
    </div>
  );
}
