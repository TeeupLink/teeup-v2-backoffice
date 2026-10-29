import type { RouteTab } from '@/components/layout/RouteTabs';

export const AUDIT_TABS: RouteTab[] = [
  { to: '/audit-logs', label: '로그', end: true },
  { to: '/audit-logs/monthly', label: '월간 점검' },
];
