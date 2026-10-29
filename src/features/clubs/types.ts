export type ClubStatus = 'ACTIVE' | 'INACTIVE';

/** GET /admin/clubs 행 (BE#62: pending_count·leader) */
export type ClubRow = {
  id: number;
  display_id: string | null;
  name: string;
  description: string | null;
  type: 'REGULAR' | 'IRREGULAR';
  member_count: number;
  pending_count?: number;
  sido_code: string;
  gungu_codes: string[];
  leader_id?: number | null;
  leader_nickname?: string | null;
  leader_name: string | null;
  status: ClubStatus;
  deleted_at: string | null;
  created_at: string;
};

/** GET /admin/clubs/{id} */
export type ClubDetail = {
  id: number;
  display_id: string | null;
  name: string;
  sido_code: string;
  gungu_codes: string[];
  type: 'REGULAR' | 'IRREGULAR';
  description: string | null;
  status: ClubStatus;
  representative_name: string | null;
  representative_id: number | null;
  location: string | null;
  contact_info: string | null;
  additional_info: string | null;
  profile_image: string | null;
  member_count: number | null;
  current_member_count: number;
  leader?: { id: number; nickname: string; realname: string | null } | null;
  pending_count?: number;
  round_count?: number;
  social_count?: number;
  last_meeting_at?: string | null;
  deleted_at?: string | null;
  created_at: string | null;
};

export type ClubMember = {
  id: number;
  user_id: number;
  role: 'LEADER' | 'MANAGER' | 'MEMBER';
  status: string;
  created_at: string;
  user_nickname: string;
  user_email: string | null;
  user_realname: string | null;
  user_phone_number: string | null;
  user_average_score: number | null;
};

export type Region = { code: string; name: string };

export type ClubNotice = {
  id: number;
  title: string;
  content: string;
  is_important: boolean;
  is_private: boolean;
  author_name: string;
  view_count: number;
  created_at: string | null;
};

export type Regulation = { id: number; title: string; content: string; status: string; category_id?: number; created_at: string | null };
export type RegulationCategory = { id: number; name: string; order: number; regulations: Regulation[] };

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';
export type ClubFee = { id: number; name: string; amount: number; cycle: BillingCycle | null; description: string | null; is_active: boolean; created_at: string | null };
