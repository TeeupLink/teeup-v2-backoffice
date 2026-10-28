import type { ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router';
import { AuditLogsPage } from '@/features/audit-logs/AuditLogsPage';
import { AuditMonthlyPage } from '@/features/audit-logs/AuditMonthlyPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { InquiriesListPage } from '@/features/inquiries/InquiriesListPage';
import { InquiryDetailPage } from '@/features/inquiries/InquiryDetailPage';
import { JoinHistoryPage } from '@/features/join-requests/JoinHistoryPage';
import { JoinRequestsPage } from '@/features/join-requests/JoinRequestsPage';
import { UsersListPage } from '@/features/users/UsersListPage';
import type { Access, Resource } from '@/lib/auth/permissions';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAccess, RequireAuth } from './auth/guards';
import { AppLayout } from './layout/AppLayout';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

type Area = {
  /** 이식 완료된 목록 화면. 없으면 준비 중 화면 */
  list?: ReactElement;
  /** 이식 완료된 상세 화면 (/:id 와 하위 탭 /:id/*) */
  detail?: ReactElement;
  /** 목록 경로. 하위 경로(/new, /:id, /:id/tab, /:id/edit)는 같은 권한을 쓴다 */
  path: string;
  resource: Resource;
  /** 목록·상세 외에 같은 읽기 권한으로 여는 하위 화면 (경로는 area 기준 상대) */
  pages?: Record<string, ReactElement>;
  /** 목록·상세 조회 외 경로(new·edit)에 필요한 권한 */
  writePaths?: string[];
  title: string;
  issue: number;
};

// 라우트 표: docs/02.기획문서/정보구조도.md 2장. 화면이 이식되면 element 를 실제 페이지로 바꾼다.
const AREAS: Area[] = [
  { path: 'dashboard/kpi', resource: 'kpi', title: 'KPI 대시보드', issue: 32 },
  { path: 'join-requests', resource: 'joinRequests', title: '가입신청', issue: 21, list: <JoinRequestsPage />, pages: { history: <JoinHistoryPage /> } },
  { path: 'inquiries', resource: 'inquiries', title: '1:1 문의', issue: 22, list: <InquiriesListPage />, detail: <InquiryDetailPage /> },
  { path: 'reports', resource: 'reports', title: '신고', issue: 29 },
  { path: 'users', resource: 'users', writePaths: ['new', ':id/edit'], title: '회원', issue: 20, list: <UsersListPage /> },
  { path: 'clubs', resource: 'clubs', writePaths: ['new', ':id/edit'], title: '클럽', issue: 24 },
  { path: 'rounds', resource: 'meetings', writePaths: ['new', ':id/edit'], title: '라운딩', issue: 23 },
  { path: 'socials', resource: 'meetings', writePaths: ['new', ':id/edit'], title: '소셜', issue: 25 },
  { path: 'notices', resource: 'content', title: '공지', issue: 26 },
  { path: 'faq', resource: 'content', title: 'FAQ', issue: 26 },
  { path: 'terms', resource: 'content', title: '약관', issue: 30 },
  { path: 'payments', resource: 'payments', title: '결제 내역', issue: 31 },
  { path: 'subscriptions', resource: 'payments', title: '구독', issue: 31 },
  { path: 'plans', resource: 'payments', title: '요금제', issue: 31 },
  { path: 'billing/failures', resource: 'payments', title: '청구 실패', issue: 31 },
  { path: 'billing/sandbox', resource: 'billingSandbox', title: '빌링 샌드박스', issue: 31 },
  { path: 'admins', resource: 'admins', title: '관리자', issue: 27 },
  { path: 'audit-logs', resource: 'auditLogs', title: '감사 로그', issue: 28, list: <AuditLogsPage />, pages: { monthly: <AuditMonthlyPage /> } },
  { path: 'profile', resource: 'profile', title: '내 프로필', issue: 27 },
];

function guarded(resource: Resource, need: Access, children: RouteObject[]): RouteObject {
  return { element: <RequireAccess resource={resource} need={need} />, children };
}

function areaRoutes(a: Area): RouteObject[] {
  const page = <ComingSoonPage title={a.title} issue={a.issue} />;
  const writes = (a.writePaths ?? []).map((p) => ({ path: `${a.path}/${p}`, element: page }));
  return [
    guarded(a.resource, 'read', [
      { path: a.path, element: a.list ?? page },
      ...Object.entries(a.pages ?? {}).map(([p, element]) => ({ path: `${a.path}/${p}`, element })),
      ...(a.detail ? [{ path: `${a.path}/:id/*`, element: a.detail }] : []),
      { path: `${a.path}/*`, element: page },
    ]),
    ...(writes.length ? [guarded(a.resource, 'write', writes)] : []),
  ];
}

export const routes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              guarded('dashboard', 'read', [{ path: 'dashboard', element: <DashboardPage /> }]),
              ...AREAS.flatMap(areaRoutes),
              { path: '403', element: <ForbiddenPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
