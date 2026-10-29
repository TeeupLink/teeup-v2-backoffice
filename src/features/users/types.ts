export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'DELETED';

export type UserRow = {
  id: number;
  email: string;
  realname: string | null;
  nickname: string;
  phone_number: string | null;
  birthdate: string | null;
  gender: string | null;
  handicap: number | null;
  average_score: number | null;
  provider: string | null;
  status: UserStatus | null;
  club_count: number | null;
  created_at: string;
  updated_at: string | null;
  /** 활동 로그 LOGIN 기준 (BE#58) */
  last_login_at?: string | null;
};

/** GET /admin/users/{id} (BE#58) — 목록 행 + 초기 골프 값·약관·최근 로그인 */
export type UserDetail = Omit<UserRow, 'club_count'> & {
  club_count: number;
  profile_image: string | null;
  average_score_init: number | null;
  handicap_init: number | null;
  handicap_update_method: 'MANUAL' | 'AUTO' | null;
  handicap_calculation_count: number | null;
  email_verified: string | null;
  deactivated_at: string | null;
  needs_terms_agreement: boolean | null;
  terms_agreement: boolean | null;
  privacy_policy: boolean | null;
  privacy_collection: boolean | null;
  marketing_consent: boolean | null;
  last_login_at: string | null;
  last_login_device: string | null;
};

export type UserClub = {
  id: number;
  name: string;
  type: string;
  location: string | null;
  status: string;
  member_role: string;
  joined_at: string | null;
};

export type UserMeeting = {
  meeting_id: number;
  meeting_name: string;
  club_name: string;
  meeting_time: string | null;
  status: string;
  joined_at: string | null;
  has_score: boolean;
  gross_score: number | null;
  net_score: number | null;
};

export type UserMeetings = {
  rounding_meetings: UserMeeting[];
  social_meetings: UserMeeting[];
  total_rounding: number;
  total_social: number;
};

export type ScoreHistoryItem = {
  id: number;
  meeting_id: number;
  meeting_name: string | null;
  club_name: string | null;
  gross_score: number;
  net_score: number | null;
  handicap_used: number;
  played_at: string;
};

export type HandicapHistory = {
  handicap_info: {
    initial_handicap: number | null;
    calculated_handicap: number | null;
    handicap_update_method: string | null;
    handicap_calculation_count: number | null;
  };
  score_history: ScoreHistoryItem[];
  total: number;
  page: number;
  limit: number;
};

export type ActivityItem = {
  id: number;
  event_type: string;
  summary: string;
  target_type: string | null;
  target_id: number | null;
  meta: Record<string, unknown> | null;
  ip_masked: string | null;
  created_at: string;
};

export type ActivityPage = { items: ActivityItem[]; next_cursor: string | null };
