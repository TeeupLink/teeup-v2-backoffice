import type { ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router';
import { AdminDetailPage } from '@/features/admins/AdminDetailPage';
import { AdminFormPage } from '@/features/admins/AdminFormPage';
import { AdminsListPage } from '@/features/admins/AdminsListPage';
import { AuditLogsPage } from '@/features/audit-logs/AuditLogsPage';
import { AuditMonthlyPage } from '@/features/audit-logs/AuditMonthlyPage';
import { ClubDetailPage } from '@/features/clubs/ClubDetailPage';
import { ClubFormPage } from '@/features/clubs/ClubFormPage';
import { NoticeFormPage } from '@/features/clubs/content/NoticeFormPage';
import { RegulationFormPage } from '@/features/clubs/content/RegulationFormPage';
import { ClubsListPage } from '@/features/clubs/ClubsListPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { FaqFormPage } from '@/features/faq/FaqFormPage';
import { FaqListPage } from '@/features/faq/FaqListPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { BlocksPage } from '@/features/reports/BlocksPage';
import { ReportDetailPage } from '@/features/reports/ReportDetailPage';
import { ReportsListPage } from '@/features/reports/ReportsListPage';
import { RoundDetailPage } from '@/features/rounds/RoundDetailPage';
import { RoundFormPage } from '@/features/rounds/RoundFormPage';
import { RoundsListPage } from '@/features/rounds/RoundsListPage';
import { SocialDetailPage } from '@/features/socials/SocialDetailPage';
import { SocialFormPage } from '@/features/socials/SocialFormPage';
import { SocialsListPage } from '@/features/socials/SocialsListPage';
import { InquiriesListPage } from '@/features/inquiries/InquiriesListPage';
import { InquiryDetailPage } from '@/features/inquiries/InquiryDetailPage';
import { JoinHistoryPage } from '@/features/join-requests/JoinHistoryPage';
import { JoinRequestsPage } from '@/features/join-requests/JoinRequestsPage';
import { NoticeDetailPage } from '@/features/notices/NoticeDetailPage';
import { NoticeFormPage as SystemNoticeFormPage } from '@/features/notices/NoticeFormPage';
import { NoticesListPage } from '@/features/notices/NoticesListPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { TermsFormPage } from '@/features/terms/TermsFormPage';
import { TermsPage } from '@/features/terms/TermsPage';
import { TermsTypePage } from '@/features/terms/TermsTypePage';
import { UserDetailPage } from '@/features/users/UserDetailPage';
import { UserFormPage } from '@/features/users/UserFormPage';
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
  /** 이식 완료된 쓰기 화면 (writePaths 의 키). 없으면 준비 중 화면 */
  forms?: Record<string, ReactElement>;
  title: string;
  issue: number;
};

// 라우트 표: docs/02.기획문서/정보구조도.md 2장. 화면이 이식되면 element 를 실제 페이지로 바꾼다.
const AREAS: Area[] = [
  { path: 'dashboard/kpi', resource: 'kpi', title: 'KPI 대시보드', issue: 32 },
  { path: 'join-requests', resource: 'joinRequests', title: '가입신청', issue: 21, list: <JoinRequestsPage />, pages: { history: <JoinHistoryPage /> } },
  { path: 'inquiries', resource: 'inquiries', title: '1:1 문의', issue: 22, list: <InquiriesListPage />, detail: <InquiryDetailPage /> },
  {
    path: 'reports',
    resource: 'reports',
    title: '신고',
    issue: 29,
    list: <ReportsListPage />,
    detail: <ReportDetailPage />,
    pages: { blocks: <BlocksPage /> },
  },
  {
    path: 'users',
    resource: 'users',
    writePaths: ['new', ':id/edit'],
    title: '회원',
    issue: 20,
    list: <UsersListPage />,
    detail: <UserDetailPage />,
    forms: { new: <UserFormPage />, ':id/edit': <UserFormPage /> },
  },
  {
    path: 'clubs',
    resource: 'clubs',
    writePaths: ['new', ':id/edit', ':id/notices/new', ':id/notices/:nid/edit', ':id/regulations/new', ':id/regulations/:rid/edit'],
    title: '클럽',
    issue: 24,
    list: <ClubsListPage />,
    detail: <ClubDetailPage />,
    forms: {
      new: <ClubFormPage />,
      ':id/edit': <ClubFormPage />,
      ':id/notices/new': <NoticeFormPage />,
      ':id/notices/:nid/edit': <NoticeFormPage />,
      ':id/regulations/new': <RegulationFormPage />,
      ':id/regulations/:rid/edit': <RegulationFormPage />,
    },
  },
  {
    path: 'rounds',
    resource: 'meetings',
    writePaths: ['new', ':id/edit'],
    title: '라운딩',
    issue: 23,
    list: <RoundsListPage />,
    detail: <RoundDetailPage />,
    forms: { new: <RoundFormPage />, ':id/edit': <RoundFormPage /> },
  },
  {
    path: 'socials',
    resource: 'meetings',
    writePaths: ['new', ':id/edit'],
    title: '소셜',
    issue: 25,
    list: <SocialsListPage />,
    detail: <SocialDetailPage />,
    forms: { new: <SocialFormPage />, ':id/edit': <SocialFormPage /> },
  },
  {
    path: 'notices',
    resource: 'content',
    writePaths: ['new', ':id/edit'],
    title: '공지',
    issue: 26,
    list: <NoticesListPage />,
    detail: <NoticeDetailPage />,
    forms: { new: <SystemNoticeFormPage />, ':id/edit': <SystemNoticeFormPage /> },
  },
  {
    path: 'faq',
    resource: 'content',
    writePaths: ['new', ':id/edit'],
    title: 'FAQ',
    issue: 26,
    list: <FaqListPage />,
    forms: { new: <FaqFormPage />, ':id/edit': <FaqFormPage /> },
  },
  {
    path: 'terms',
    resource: 'content',
    writePaths: ['new', 'edit/:vid'],
    title: '약관',
    issue: 30,
    list: <TermsPage />,
    detail: <TermsTypePage />,
    forms: { new: <TermsFormPage />, 'edit/:vid': <TermsFormPage /> },
  },
  { path: 'payments', resource: 'payments', title: '결제 내역', issue: 31 },
  { path: 'subscriptions', resource: 'payments', title: '구독', issue: 31 },
  { path: 'plans', resource: 'payments', title: '요금제', issue: 31 },
  { path: 'billing/failures', resource: 'payments', title: '청구 실패', issue: 31 },
  { path: 'billing/sandbox', resource: 'billingSandbox', title: '빌링 샌드박스', issue: 31 },
  {
    path: 'admins',
    resource: 'admins',
    writePaths: ['new', ':id/edit'],
    title: '관리자',
    issue: 27,
    list: <AdminsListPage />,
    detail: <AdminDetailPage />,
    forms: { new: <AdminFormPage />, ':id/edit': <AdminFormPage /> },
  },
  { path: 'audit-logs', resource: 'auditLogs', title: '감사 로그', issue: 28, list: <AuditLogsPage />, pages: { monthly: <AuditMonthlyPage /> } },
  { path: 'profile', resource: 'profile', title: '내 프로필', issue: 27, list: <ProfilePage /> },
];

function guarded(resource: Resource, need: Access, children: RouteObject[]): RouteObject {
  return { element: <RequireAccess resource={resource} need={need} />, children };
}

function areaRoutes(a: Area): RouteObject[] {
  const page = <ComingSoonPage title={a.title} issue={a.issue} />;
  const writes = (a.writePaths ?? []).map((p) => ({ path: `${a.path}/${p}`, element: a.forms?.[p] ?? page }));
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
