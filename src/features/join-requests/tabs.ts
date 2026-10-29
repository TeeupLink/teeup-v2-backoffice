import type { RouteTab } from '@/components/layout/RouteTabs';

export const JOIN_TABS: RouteTab[] = [
  { to: '/join-requests', label: '대기', end: true },
  { to: '/join-requests/history', label: '처리 이력' },
];
