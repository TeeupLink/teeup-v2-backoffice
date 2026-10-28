import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { StatusPage } from './StatusPage';

export function ForbiddenPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      title="이 화면에 접근할 권한이 없습니다"
      description="필요한 권한이 있다면 최고 관리자에게 요청하세요."
      action={<Link to="/dashboard" className="text-sm font-medium text-primary-800 hover:underline">대시보드로</Link>}
    />
  );
}
