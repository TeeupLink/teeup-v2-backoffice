import { api } from '@/lib/api/client';

const V = '/admin/terms/versions';

export type TermsType = 'SERVICE' | 'PRIVACY' | 'PRIVACY_COLLECTION' | 'MARKETING';
export type VersionStatus = 'ACTIVE' | 'DRAFT' | 'RETIRED';

/** BE#69 버전 행 */
export type TermsVersion = {
  id: number;
  type: TermsType;
  version: number;
  title: string;
  status: VersionStatus;
  is_required: boolean;
  agreement_count: number;
  created_by_name: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  content?: string;
};
export type TermsSummary = { type: TermsType; default_title: string; active: TermsVersion | null; version_count: number; draft_count: number };

export const TYPE_LABEL: Record<TermsType, string> = {
  SERVICE: '서비스 이용약관',
  PRIVACY: '개인정보처리방침',
  PRIVACY_COLLECTION: '개인정보 수집·이용 동의',
  MARKETING: '마케팅 정보 수신 동의',
};
export const STATUS_LABEL: Record<VersionStatus, string> = { ACTIVE: '게시중', DRAFT: '초안', RETIRED: '지난 버전' };
export const isTermsType = (v: string | undefined): v is TermsType => !!v && v in TYPE_LABEL;

export const termsKey = ['terms'] as const;
export const fetchSummary = () => api<{ items: TermsSummary[] }>(V).then((r) => r.items);
export const fetchVersions = (type: TermsType) => api<{ items: TermsVersion[] }>(V, { query: { type } }).then((r) => r.items);
export const fetchVersion = (id: number) => api<TermsVersion & { content: string }>(`${V}/${id}`);
export type VersionInput = { title: string; content: string; is_required: boolean };
export const createVersion = (type: TermsType, body: VersionInput) => api<TermsVersion>(V, { method: 'POST', body: { type, ...body } });
export const updateVersion = (id: number, body: Partial<VersionInput>) => api<TermsVersion>(`${V}/${id}`, { method: 'PUT', body });
export const publishVersion = (id: number) => api<TermsVersion>(`${V}/${id}/publish`, { method: 'POST' });
export const deleteVersion = (id: number) => api(`${V}/${id}`, { method: 'DELETE' });

/** 버전별 동의 회원 (F-111) */
export type VersionAgreement = {
  id: number;
  user_id: number;
  nickname: string;
  user_status: string | null;
  agreed_at: string | null;
  ip_address: string | null;
};
export const agreementsPath = (id: number) => `${V}/${id}/agreements`;
