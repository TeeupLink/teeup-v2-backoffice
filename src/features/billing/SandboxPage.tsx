import { useMutation } from '@tanstack/react-query';
import { AlertOctagon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Card } from '@/components/display/Card';
import { Badge } from '@/components/display/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { useBillingStatus } from './useBillingStatus';
import { sandboxCancel, sandboxCharge, sandboxIssue, type SandboxCharged, type SandboxIssued } from './api';
import { requestCardRegistration, tossClientKey } from './tossSdk';

// SCR-086 빌링 샌드박스 (F-125) — 테스트 키로 카드 등록 → 빌링키 발급 → 100원 청구 → 취소. DB 에 남지 않는다

type Saved = { customerKey: string; issued?: SandboxIssued; charged?: SandboxCharged; canceled?: boolean; log: string[] };
const STORE = 'billing-sandbox';
const fresh = (): Saved => ({ customerKey: `sandbox_${crypto.randomUUID()}`, log: [] });

function load(): Saved {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Saved) : fresh();
  } catch {
    return fresh();
  }
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="w-40 shrink-0 text-sm font-medium text-slate-800">
        {n}. {title}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</span>
      {done ? <Badge tone="success">완료</Badge> : <Badge>대기</Badge>}
    </li>
  );
}

export function SandboxPage() {
  const { data: status } = useBillingStatus();
  const [params, setParams] = useSearchParams();
  const [s, setS] = useState<Saved>(load);
  const handled = useRef(false);
  const clientKey = tossClientKey();
  const blocked = !clientKey.startsWith('test_') || (status && status.mode !== 'test');

  const update = (patch: Partial<Saved>, line?: string) =>
    setS((prev) => {
      const next = { ...prev, ...patch, log: line ? [...prev.log, `${formatDateTime(new Date())} ${line}`] : prev.log };
      try {
        sessionStorage.setItem(STORE, JSON.stringify(next));
      } catch {
        // 저장이 막힌 브라우저 — 새로고침하면 처음부터
      }
      return next;
    });

  const issue = useMutation({
    mutationFn: (authKey: string) => sandboxIssue(authKey, s.customerKey),
    onSuccess: (r) => update({ issued: r, charged: undefined, canceled: undefined }, `POST /billing/sandbox/issue 200 (${r.card_company ?? ''} ${r.card_number_masked ?? ''})`),
    onError: (e) => update({}, `POST /billing/sandbox/issue 실패: ${errorMessage(e)}`),
  });
  const charge = useMutation({
    mutationFn: () => sandboxCharge(s.issued!.token, s.customerKey),
    onSuccess: (r) => update({ charged: r, canceled: undefined }, `POST /billing/sandbox/charge 200 ${r.amount}원 (Idempotency-Key: ${r.idempotency_key})`),
    onError: (e) => update({}, `POST /billing/sandbox/charge 실패: ${errorMessage(e)}`),
  });
  const cancel = useMutation({
    mutationFn: () => sandboxCancel(s.charged!.payment_key),
    onSuccess: (r) => update({ canceled: true }, `POST /billing/sandbox/cancel 200 (${r.status})`),
    onError: (e) => update({}, `POST /billing/sandbox/cancel 실패: ${errorMessage(e)}`),
  });

  // 토스 카드 등록 창에서 돌아온 경우 (successUrl ?result=success&authKey&customerKey / failUrl ?result=fail&code&message)
  useEffect(() => {
    const result = params.get('result');
    if (!result || handled.current) return;
    handled.current = true;
    if (result === 'success' && params.get('authKey') && params.get('customerKey') === s.customerKey) issue.mutate(params.get('authKey')!);
    else update({}, `카드 등록 실패: ${params.get('message') ?? '알 수 없는 오류'} (${params.get('code') ?? result})`);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 돌아온 직후 한 번만
  }, [params]);

  const [opening, setOpening] = useState(false);
  const register = async () => {
    setOpening(true);
    try {
      await requestCardRegistration(s.customerKey, `${window.location.origin}/billing/sandbox`);
    } catch (e) {
      update({}, `카드 등록 창을 열지 못했습니다: ${errorMessage(e)}`);
    } finally {
      setOpening(false);
    }
  };
  const reset = () => update({ ...fresh() }, '처음부터 다시');

  return (
    <>
      <PageHeader
        title="빌링 샌드박스"
        description="테스트 키로 카드 등록부터 청구·취소까지 확인합니다. 실제 과금이 없고, 회원·결제 데이터에 남지 않습니다."
        actions={blocked ? <Badge tone="danger">사용 불가</Badge> : <Badge tone="info">테스트 모드</Badge>}
      />
      {blocked && (
        <div role="alert" className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertOctagon className="h-4 w-4 shrink-0" aria-hidden />
          {!clientKey ? '토스 테스트 클라이언트 키(VITE_TOSS_CLIENT_KEY)가 없습니다.' : '운영 키에서는 샌드박스를 사용할 수 없습니다.'}
        </div>
      )}
      <Card
        title="단계"
        actions={
          <Button size="sm" variant="ghost" onClick={reset}>
            처음부터
          </Button>
        }
      >
        <ol className="divide-y divide-slate-100">
          <Step n={1} title="카드 등록" done={!!s.issued}>
            <Button size="sm" disabled={!!blocked} loading={opening} onClick={() => void register()}>
              토스 카드 등록 열기
            </Button>
            {s.issued && (
              <span className="text-sm text-slate-600">
                {s.issued.card_company} {s.issued.card_number_masked}
              </span>
            )}
          </Step>
          <Step n={2} title="빌링키 발급" done={!!s.issued}>
            <span className="text-sm text-slate-500">{issue.isPending ? '발급 중…' : s.issued ? `billingKey ${s.issued.billing_key_hint}` : '카드 등록 후 자동'}</span>
          </Step>
          <Step n={3} title="1회 청구 (100원)" done={!!s.charged}>
            <Button size="sm" disabled={!!blocked || !s.issued} loading={charge.isPending} onClick={() => charge.mutate()}>
              청구 실행
            </Button>
            {s.charged && <span className="break-all font-mono text-xs text-slate-500">{s.charged.payment_key}</span>}
          </Step>
          <Step n={4} title="취소" done={!!s.canceled}>
            <Button size="sm" disabled={!!blocked || !s.charged || s.canceled} loading={cancel.isPending} onClick={() => cancel.mutate()}>
              취소 실행
            </Button>
          </Step>
        </ol>
      </Card>
      <Card title="로그" className="mt-4">
        {s.log.length === 0 ? (
          <p className="text-sm text-slate-500">아직 기록이 없습니다.</p>
        ) : (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-700">{s.log.join('\n')}</pre>
        )}
      </Card>
    </>
  );
}
