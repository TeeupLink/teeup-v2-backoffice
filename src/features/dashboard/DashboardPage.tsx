import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/app/auth/useAuth';

// "오늘 처리할 일"·운영 요약은 #19 에서 구현
export function DashboardPage() {
  const { me } = useAuth();
  return (
    <>
      <PageHeader title="대시보드" description={me ? `${me.name || me.email}님, 오늘 처리할 일을 확인하세요.` : undefined} />
      <div className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
        "오늘 처리할 일" 카드는 #19 에서 구현합니다.
      </div>
    </>
  );
}
