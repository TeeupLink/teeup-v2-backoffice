import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { Card, StatCard } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { formatDate, formatDateTime } from '@/lib/format';
import { fetchGunguList, fetchSidoList } from '../api';
import { CLUB_TYPE } from '../labels';
import type { ClubDetail } from '../types';

export function OverviewTab({ club: c }: { club: ClubDetail }) {
  const { can } = useAuth();
  const sido = useQuery({ queryKey: ['sido-list'], queryFn: fetchSidoList, staleTime: Infinity });
  const gungu = useQuery({ queryKey: ['gungu-list', c.sido_code], queryFn: () => fetchGunguList(c.sido_code), enabled: !!c.sido_code, staleTime: Infinity });
  const sidoName = sido.data?.find((r) => r.code === c.sido_code)?.name ?? c.sido_code;
  const gunguNames = c.gungu_codes.map((g) => gungu.data?.find((r) => r.code === g)?.name ?? g);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="활동 멤버" value={c.current_member_count} />
        <StatCard label="가입 대기" value={c.pending_count ?? 0} />
        <StatCard label="라운딩 · 소셜" value={`${c.round_count ?? 0} · ${c.social_count ?? 0}`} />
        <StatCard label="최근 모임일" value={<span className="text-xl">{formatDate(c.last_meeting_at)}</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="기본 정보">
          <DescriptionList
            items={[
              { label: '유형', value: CLUB_TYPE[c.type] ?? c.type },
              { label: '클럽 코드', value: c.display_id ?? '-' },
              {
                label: '리더',
                value:
                  c.leader && can('users') ? (
                    <Link to={`/users/${c.leader.id}`} className="font-medium text-primary-800 hover:underline">
                      {c.leader.nickname}
                    </Link>
                  ) : (
                    (c.leader?.nickname ?? c.representative_name ?? '-')
                  ),
              },
              { label: '예상 인원', value: c.member_count ? `${c.member_count}명` : '-' },
              { label: '설명', value: c.description || '-', full: true },
            ]}
          />
        </Card>
        <Card title="지역 · 연락처">
          <DescriptionList
            items={[
              { label: '지역', value: [sidoName, gunguNames.join(', ')].filter(Boolean).join(' · ') || '-', full: true },
              { label: '연락처', value: c.contact_info || '-' },
              { label: '장소', value: c.location || '-' },
              { label: '추가 정보', value: c.additional_info || '-', full: true },
              { label: '생성', value: formatDateTime(c.created_at) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
