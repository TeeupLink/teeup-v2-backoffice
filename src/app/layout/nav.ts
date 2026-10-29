import {
  AlertTriangle,
  CircleDot,
  Coffee,
  CreditCard,
  FileText,
  Flag,
  FlaskConical,
  HelpCircle,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquare,
  Repeat,
  ScrollText,
  Shield,
  Tag,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Resource } from '@/lib/auth/permissions';

export type NavItem = { label: string; to: string; icon: LucideIcon; resource: Resource };
export type NavSection = { label: string; items: NavItem[] };

// 메뉴 순서·구성: docs/02.기획문서/정보구조도.md 1장
export const NAV: NavSection[] = [
  {
    label: '대시보드',
    items: [
      { label: '대시보드', to: '/dashboard', icon: LayoutDashboard, resource: 'dashboard' },
      { label: 'KPI', to: '/dashboard/kpi', icon: LineChart, resource: 'kpi' },
    ],
  },
  {
    label: '업무',
    items: [
      { label: '가입신청', to: '/join-requests', icon: UserPlus, resource: 'joinRequests' },
      { label: '1:1 문의', to: '/inquiries', icon: MessageSquare, resource: 'inquiries' },
      { label: '신고', to: '/reports', icon: Flag, resource: 'reports' },
    ],
  },
  {
    label: '운영',
    items: [
      { label: '회원', to: '/users', icon: Users, resource: 'users' },
      { label: '클럽', to: '/clubs', icon: Shield, resource: 'clubs' },
      { label: '라운딩', to: '/rounds', icon: CircleDot, resource: 'meetings' },
      { label: '소셜', to: '/socials', icon: Coffee, resource: 'meetings' },
    ],
  },
  {
    label: '콘텐츠',
    items: [
      { label: '공지', to: '/notices', icon: Megaphone, resource: 'content' },
      { label: 'FAQ', to: '/faq', icon: HelpCircle, resource: 'content' },
      { label: '약관', to: '/terms', icon: FileText, resource: 'content' },
    ],
  },
  {
    label: '결제',
    items: [
      { label: '결제 내역', to: '/payments', icon: CreditCard, resource: 'payments' },
      { label: '구독', to: '/subscriptions', icon: Repeat, resource: 'payments' },
      { label: '요금제', to: '/plans', icon: Tag, resource: 'payments' },
      { label: '청구 실패', to: '/billing/failures', icon: AlertTriangle, resource: 'payments' },
      { label: '빌링 샌드박스', to: '/billing/sandbox', icon: FlaskConical, resource: 'billingSandbox' },
    ],
  },
  {
    label: '시스템',
    items: [
      { label: '관리자', to: '/admins', icon: UserCog, resource: 'admins' },
      { label: '감사 로그', to: '/audit-logs', icon: ScrollText, resource: 'auditLogs' },
    ],
  },
];

/** 현재 경로에 해당하는 메뉴 (가장 긴 접두사 일치) */
export function findNav(pathname: string): { section: NavSection; item: NavItem } | null {
  let best: { section: NavSection; item: NavItem } | null = null;
  for (const section of NAV) {
    for (const item of section.items) {
      const hit = pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (hit && (!best || item.to.length > best.item.to.length)) best = { section, item };
    }
  }
  return best;
}
