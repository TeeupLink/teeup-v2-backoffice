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
};
