import { Hammer } from 'lucide-react';
import { StatusPage } from './StatusPage';

/** 재구축 중 아직 이식하지 않은 화면. 교체 배포(#33) 전에 모두 사라져야 한다 */
export function ComingSoonPage({ title, issue }: { title: string; issue: number }) {
  return <StatusPage icon={Hammer} title={`${title} — 준비 중`} description={`teeup-v2-backoffice #${issue} 에서 이식합니다.`} />;
}
