import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { confirm } from '@/components/dialog/confirm-store';
import { toast } from '@/components/feedback/toast-store';
import { Select } from '@/components/form/controls';
import { StatusFlow } from '@/features/rounds/detail/OverviewTab';
import type { MeetingStatus } from '@/features/rounds/types';
import { errorMessage } from '@/lib/api/errors';
import { formatDateTime, formatWon } from '@/lib/format';
import { statusOptions } from '@/lib/status';
import { updateSocial } from '../api';
import { SOCIAL_SETTLEMENT, SOCIAL_TYPE } from '../labels';
import type { SocialDetail } from '../types';

export function OverviewTab({ social: s, writable }: { social: SocialDetail; writable: boolean }) {
  const qc = useQueryClient();
  const change = useMutation({
    mutationFn: (status: MeetingStatus) => updateSocial(s.id, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['social', s.id] });
      await qc.invalidateQueries({ queryKey: ['socials'] });
      toast.success('상태를 바꿨습니다');
    },
    onError: (e) => toast.error('상태를 바꾸지 못했습니다', { description: errorMessage(e) }),
  });

  const onStatus = async (next: MeetingStatus) => {
    if (next === s.status) return;
    if (next === 'CANCELED') {
      const ok = await confirm({ title: '소셜 모임을 취소할까요?', confirmText: '모임 취소', tone: 'danger' });
      if (!ok) return;
    }
    change.mutate(next);
  };

  return (
    <div className="space-y-4">
      <Card
        title="진행 상태"
        actions={
          writable && (
            <Select
              aria-label="상태 변경"
              value={s.status}
              disabled={change.isPending}
              onChange={(e) => void onStatus(e.target.value as MeetingStatus)}
              options={statusOptions('meeting')}
            />
          )
        }
      >
        <StatusFlow status={s.status} noun="모임" />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="일정">
          <DescriptionList
            items={[
              { label: '유형', value: s.social_type ? (SOCIAL_TYPE[s.social_type] ?? s.social_type) : '-' },
              { label: '클럽', value: s.club_name },
              { label: '일시', value: formatDateTime(s.meeting_time) },
              { label: '신청 마감', value: formatDateTime(s.application_deadline) },
              { label: '장소명', value: s.venue_name || '-' },
              { label: '주소', value: s.location || '-' },
              { label: '정원', value: s.max_participants ? `${s.max_participants}명` : '제한 없음' },
              { label: '설명', value: s.description || '-', full: true },
            ]}
          />
        </Card>
        <Card title="비용 · 안내">
          <DescriptionList
            items={[
              { label: '참가비', value: formatWon(s.social_cost) },
              { label: '정산 방식', value: s.settlement_method ? (SOCIAL_SETTLEMENT[s.settlement_method] ?? s.settlement_method) : '-' },
              { label: '안내 사항', value: s.social_notes || '-', full: true },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
