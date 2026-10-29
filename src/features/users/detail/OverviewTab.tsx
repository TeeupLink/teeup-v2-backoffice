import { Card } from '@/components/display/Card';
import { DescriptionList } from '@/components/display/DescriptionList';
import { Badge } from '@/components/display/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import { usePII } from '@/lib/usePII';
import { GENDER, PROVIDER } from '../labels';
import type { UserDetail } from '../types';

const agreed = (v: boolean | null) => (v ? <Badge tone="success">동의</Badge> : <Badge tone="neutral">미동의</Badge>);

export function OverviewTab({ user: u }: { user: UserDetail }) {
  const pii = usePII();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="기본정보">
        <DescriptionList
          items={[
            { label: '이메일', value: pii.email(u.email) },
            { label: '가입 방식', value: u.provider ? (PROVIDER[u.provider] ?? u.provider) : '-' },
            { label: '실명', value: pii.name(u.realname) },
            { label: '닉네임', value: u.nickname },
            { label: '전화', value: pii.phone(u.phone_number) },
            { label: '생년월일', value: formatDate(u.birthdate) },
            { label: '성별', value: u.gender ? (GENDER[u.gender] ?? u.gender) : '-' },
            { label: '이메일 인증', value: u.email_verified ? formatDateTime(u.email_verified) : '미인증' },
          ]}
        />
      </Card>
      <div className="space-y-4">
        <Card title="계정">
          <DescriptionList
            items={[
              { label: '가입일', value: formatDateTime(u.created_at) },
              { label: '최근 변경', value: formatDateTime(u.updated_at) },
              { label: '비활성화', value: u.deactivated_at ? formatDateTime(u.deactivated_at) : '-' },
              { label: '약관 재동의 필요', value: u.needs_terms_agreement ? '예' : '아니오' },
            ]}
          />
        </Card>
        <Card title="약관 동의">
          <DescriptionList
            items={[
              { label: '서비스 이용약관', value: agreed(u.terms_agreement) },
              { label: '개인정보 처리방침', value: agreed(u.privacy_policy) },
              { label: '개인정보 수집·이용', value: agreed(u.privacy_collection) },
              { label: '마케팅 수신 (선택)', value: agreed(u.marketing_consent) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
