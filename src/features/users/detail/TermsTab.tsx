import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Badge } from '@/components/display/StatusBadge';
import type { Page } from '@/lib/api/envelope';
import { formatDateTime } from '@/lib/format';
import { isTermsType, STATUS_LABEL, TYPE_LABEL } from '@/features/terms/api';
import { fetchUserTermsAgreements } from '../api';
import type { TermsAgreementItem } from '../types';

// F-111 회원별 약관 동의 이력. 최근 동의 먼저, 게시중 필수 약관 중 미동의는 위에 따로 알린다
const CONFIG = {};
const TONE = { ACTIVE: 'success', DRAFT: 'warning', RETIRED: 'neutral' } as const;
const col = createColumnHelper<TermsAgreementItem>();
const typeLabel = (t: string | null) => (isTermsType(t ?? undefined) ? TYPE_LABEL[t as keyof typeof TYPE_LABEL] : (t ?? '-'));

export function TermsTab({ userId }: { userId: number }) {
  const { can } = useAuth();
  const linkTerms = can('content');
  const list = useListState(CONFIG);
  const opts = { queryKey: ['user', userId, 'terms-agreements'], queryFn: () => fetchUserTermsAgreements(userId) };
  // 같은 키라 요청은 한 번이다. 표는 Page 모양, 경고는 원본을 본다
  const query = useQuery({
    ...opts,
    select: (d): Page<TermsAgreementItem> => ({ items: d.items, total: d.items.length, page: 1, size: Math.max(d.items.length, 1) }),
  });
  const raw = useQuery(opts);
  const columns = useMemo(
    () => [
      col.accessor('type', { header: '약관', cell: (c) => typeLabel(c.getValue()) }),
      col.accessor('version', {
        header: '버전',
        cell: ({ row: { original: a } }) =>
          linkTerms && a.type && a.version ? (
            <Link to={`/terms/${a.type}/v/${a.terms_id}`} className="font-medium text-slate-900 hover:underline">
              v{a.version}
            </Link>
          ) : a.version ? (
            `v${a.version}`
          ) : (
            '-'
          ),
      }),
      col.accessor('title', { header: '제목', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('status', {
        header: '버전 상태',
        cell: (c) => {
          const s = c.getValue();
          return s ? <Badge tone={TONE[s]}>{STATUS_LABEL[s]}</Badge> : '-';
        },
      }),
      col.accessor('is_required', { header: '필수', cell: (c) => (c.getValue() == null ? '-' : c.getValue() ? '필수' : '선택') }),
      col.accessor('agreed_at', { header: '동의 일시', cell: (c) => formatDateTime(c.getValue()) }),
      col.accessor('ip_address', { header: 'IP', cell: (c) => c.getValue() ?? '-' }),
    ],
    [linkTerms],
  );
  const missing = raw.data?.missing_required ?? [];
  return (
    <>
      {missing.length > 0 && (
        <div role="status" className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">게시중인 필수 약관 중 아직 동의하지 않은 것이 있습니다</p>
            <p className="mt-0.5">{missing.map((m) => `${typeLabel(m.type)} v${m.version}`).join(', ')}</p>
          </div>
        </div>
      )}
      <DataTable list={list} query={query} columns={columns} getRowId={(a) => a.id} empty={{ title: '약관 동의 기록이 없습니다' }} />
    </>
  );
}
