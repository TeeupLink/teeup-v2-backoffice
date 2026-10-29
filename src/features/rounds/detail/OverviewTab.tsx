import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { Select } from '@/components/form/controls';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { formatDateTime, formatWon } from '@/lib/format';
import { statusOf, statusOptions } from '@/lib/status';
import { updateRoundStatus } from '../api';
import { FORMATION_MODE, SETTLEMENT_METHOD, STATUS_FLOW, SUBTYPE } from '../labels';
import type { MeetingStatus, RoundDetail } from '../types';

/** 예정 → 진행중 → 완료 진행 표시. 취소면 따로 표시 (소셜 개요도 같이 쓴다) */
export function StatusFlow({ status, noun = '라운딩' }: { status: MeetingStatus; noun?: string }) {
  if (status === 'CANCELED') return <p className="text-sm font-medium text-red-700">취소된 {noun}입니다</p>;
  const at = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="flex items-center gap-2" aria-label="진행 상태">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-current={i === at ? 'step' : undefined}>
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
              i < at ? 'bg-primary-600 text-white' : i === at ? 'bg-primary-100 text-primary-800 ring-2 ring-primary-600' : 'bg-slate-100 text-slate-400',
            )}
          >
            {i < at ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={cn('text-sm', i <= at ? 'font-medium text-slate-900' : 'text-slate-400')}>{statusOf('meeting', s).label}</span>
          {i < STATUS_FLOW.length - 1 && <span className="mx-1 h-px w-8 bg-slate-200" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export function OverviewTab({ round: r, writable }: { round: RoundDetail; writable: boolean }) {
  const qc = useQueryClient();
  const change = useMutation({
    mutationFn: (s: MeetingStatus) => updateRoundStatus(r.id, s),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['round', r.id] });
      await qc.invalidateQueries({ queryKey: ['rounds'] });
      toast.success('상태를 바꿨습니다');
    },
    onError: (e) => toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) }),
  });

  const onStatus = async (s: MeetingStatus) => {
    if (s === r.status) return;
    if (s === 'CANCELED') {
      const ok = await confirm({
        title: '라운딩을 취소할까요?',
        description: '참가자에게 상태 변경 알림이 갑니다.',
        confirmText: '라운딩 취소',
        tone: 'danger',
      });
      if (!ok) return;
    }
    change.mutate(s);
  };

  return (
    <div className="space-y-4">
      <Card
        title="진행 상태"
        actions={
          writable && (
            <Select
              aria-label="상태 변경"
              value={r.status}
              disabled={change.isPending}
              onChange={(e) => void onStatus(e.target.value as MeetingStatus)}
              options={statusOptions('meeting')}
            />
          )
        }
      >
        <StatusFlow status={r.status} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="일정">
          <DescriptionList
            items={[
              {
                label: '구분',
                value: r.meeting_subtype ? (SUBTYPE[r.meeting_subtype] ?? r.meeting_subtype) : '-',
              },
              { label: '공개', value: r.is_private ? '프라이빗' : '공개' },
              { label: '클럽', value: r.club_name },
              { label: '일시', value: formatDateTime(r.meeting_time) },
              {
                label: '신청 마감',
                value: formatDateTime(r.application_deadline),
              },
              { label: '장소', value: r.location || '-' },
              { label: '설명', value: r.description || '-', full: true },
            ]}
          />
        </Card>
        <Card title="골프장 · 편성">
          <DescriptionList
            items={[
              { label: '골프장', value: r.course_name || '-' },
              { label: '예약자', value: r.reservation_name || '-' },
              { label: '홀', value: r.hole_count ? `${r.hole_count}홀` : '-' },
              {
                label: '티타임',
                value: r.tee_times.length ? r.tee_times.join(', ') : '-',
              },
              {
                label: '정원',
                value: r.max_participants ? `${r.max_participants}명` : '-',
              },
              {
                label: '조당 인원',
                value: r.team_size ? `${r.team_size}명` : '-',
              },
              {
                label: '편성 방식',
                value: r.team_formation_mode ? (FORMATION_MODE[r.team_formation_mode] ?? r.team_formation_mode) : '-',
                full: true,
              },
            ]}
          />
        </Card>
        <Card title="비용">
          <DescriptionList
            columns={3}
            items={[
              { label: '그린피', value: formatWon(r.green_fee) },
              { label: '캐디피', value: formatWon(r.caddy_fee) },
              { label: '카트비', value: formatWon(r.cart_fee) },
              {
                label: '정산 방식',
                value: r.settlement_method ? (SETTLEMENT_METHOD[r.settlement_method] ?? r.settlement_method) : '-',
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
