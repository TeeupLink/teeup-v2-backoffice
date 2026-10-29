export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

/** GET /admin/meetings/rounding 행 (BE#59: confirmed_count) */
export type RoundRow = {
  id: string;
  name: string;
  meeting_subtype: string;
  course_name: string;
  location: string;
  meeting_time: string | null;
  max_participants: number;
  status: MeetingStatus;
  club_id: string;
  club_name: string;
  participant_count: number;
  confirmed_count?: number;
  creator: { id: number; realname: string | null; nickname: string } | null;
};

/** GET /admin/meetings/{id} */
export type RoundDetail = {
  id: number;
  name: string;
  description: string | null;
  meeting_type: 'ROUND' | 'SOCIAL';
  meeting_subtype: string | null;
  location: string | null;
  course_name: string | null;
  tee_times: string[];
  meeting_time: string | null;
  application_deadline: string | null;
  reservation_name: string | null;
  hole_count: number | null;
  team_size: number | null;
  team_formation_mode: string | null;
  green_fee: number | null;
  caddy_fee: number | null;
  cart_fee: number | null;
  total_cost: number | null;
  settlement_method: string | null;
  is_private: boolean;
  max_participants: number | null;
  status: MeetingStatus;
  club_id: number;
  club_name: string;
  participant_count: number;
  created_at: string | null;
};

export type Participant = {
  id: number;
  user_id: number | null;
  guest_id: number | null;
  user_name: string;
  user_nickname: string;
  status: string;
  role: string;
  is_guest: boolean;
  guest_gender?: string | null;
  guest_birthdate?: string | null;
  guest_handicap?: number | null;
  created_at: string | null;
};

export type TeamMember = {
  participant_id: number | null;
  user_id: number | null;
  guest_id: number | null;
  user_name: string;
  user_nickname: string;
  is_guest: boolean;
  gender: string | null;
  handicap: number | null;
};

export type Team = {
  id: number;
  name: string;
  meeting_id: number;
  members: TeamMember[];
  formation_mode: string | null;
};

export type ScoreRow = {
  participant_id: number;
  user_id: number | null;
  score: number | null;
};

export type SettlementPerson = {
  id: number;
  user_id: number | null;
  guest_id: number | null;
  user_name: string;
  is_guest: boolean;
  amount: number;
  amount_paid: number;
  is_paid: boolean;
  paid_at: string | null;
};

/** GET /admin/meetings/{id}/settlement 의 settlement (라운딩) */
export type Settlement = {
  id: number;
  total_cost: number;
  amount_per_person: number;
  total_participants: number;
  notes: string | null;
  green_fee?: number;
  caddy_fee?: number;
  cart_fee?: number;
  other_fee?: number;
  other_expense_items?: { title: string; amount: number }[];
  participants: SettlementPerson[];
};
