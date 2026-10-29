import type { MeetingStatus, SettlementPerson } from '@/features/rounds/types';

export type SocialType = 'CASUAL' | 'DINNER' | 'EVENT';

/** GET /admin/meetings/event 행 (BE#64: social_type, confirmed_count, settlement_confirmed) */
export type SocialRow = {
  id: number;
  name: string;
  social_type: SocialType | null;
  venue_name: string | null;
  location: string | null;
  meeting_time: string | null;
  max_participants: number | null;
  status: MeetingStatus;
  club_id: number;
  club_name: string;
  participant_count: number;
  confirmed_count?: number;
  settlement_confirmed?: boolean;
  creator: { id: number; realname: string | null; nickname: string } | null;
};

/** GET /admin/meetings/{id} 중 소셜이 쓰는 값 */
export type SocialDetail = {
  id: number;
  name: string;
  description: string | null;
  meeting_type: 'ROUND' | 'SOCIAL';
  social_type: SocialType | null;
  venue_name: string | null;
  location: string | null;
  meeting_time: string | null;
  application_deadline: string | null;
  max_participants: number | null;
  social_cost: number | null;
  social_notes: string | null;
  settlement_method: string | null;
  settlement_confirmed?: boolean;
  status: MeetingStatus;
  club_id: number;
  club_name: string;
  participant_count: number;
  created_at: string | null;
};

export type SocialItem = { id?: number; title: string; amount: number; memo: string | null; covered_by_fee: boolean };

/** GET /admin/meetings/{id}/settlement 의 settlement (소셜) */
export type SocialSettlement = {
  id: number;
  total_cost: number;
  amount_per_person: number;
  total_participants: number;
  notes: string | null;
  exclude_remaining_amount?: boolean;
  expense_items: SocialItem[];
  participants: SettlementPerson[];
};
