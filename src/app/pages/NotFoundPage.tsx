import { SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { StatusPage } from './StatusPage';

export function NotFoundPage({ title = '페이지를 찾을 수 없습니다' }: { title?: string }) {
  return (
    <StatusPage
      icon={SearchX}
      title={title}
      description="주소가 바뀌었거나 삭제된 대상일 수 있습니다."
      action={<Link to="/dashboard" className="text-sm font-medium text-primary-800 hover:underline">대시보드로</Link>}
    />
  );
}
