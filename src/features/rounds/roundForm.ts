import { z } from 'zod';
import type { Participant, RoundDetail } from './types';

// SCR-051 라운딩 등록·수정 폼 스키마·변환 (RoundFormPage)

const digits = z.string().regex(/^\d*$/, '숫자만 입력해주세요');
const intIn = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, `${label}은(는) ${min}~${max} 사이입니다`);

export const guestSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요'),
  birthdate: z.string(),
  gender: z.string(),
  average_score: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 55 && Number(v) <= 144), '55~144'),
});

export const roundSchema = z
  .object({
    meeting_subtype: z.enum(['REGULAR', 'IRREGULAR', 'ONE_TIME']),
    is_private: z.boolean(),
    name: z.string().trim().min(1, '모임명을 입력해주세요').max(100),
    description: z.string(),
    location: z.string(),
    club_id: z.string().min(1, '클럽을 선택해주세요'),
    meeting_time: z.string().min(1, '일시를 입력해주세요'),
    application_deadline: z.string().min(1, '신청 마감을 입력해주세요'),
    members: z.array(z.object({ user_id: z.number(), nickname: z.string() })),
    guests: z.array(guestSchema),
    course_name: z.string(),
    reservation_name: z.string(),
    hole_count: z.string(),
    tee_times: z.array(z.object({ value: z.string() })),
    max_participants: intIn(2, 200, '최대 인원'),
    team_size: z.enum(['2', '3', '4']),
    team_formation_mode: z.string(),
    green_fee: digits,
    caddy_fee: digits,
    cart_fee: digits,
    settlement_method: z.string(),
    /** 참가자 섹션 편집 가능 여부 (프라이빗 + 등록 또는 예정 상태). 폼 밖 값 */
    participantsEditable: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.meeting_time && v.application_deadline && v.application_deadline > v.meeting_time)
      ctx.addIssue({ code: 'custom', path: ['application_deadline'], message: '신청 마감은 모임 일시보다 앞서야 합니다' });
    if (!v.tee_times.some((t) => t.value)) ctx.addIssue({ code: 'custom', path: ['tee_times'], message: '티타임을 1개 이상 입력해주세요' });
    if (v.is_private && v.participantsEditable && v.members.length + v.guests.length === 0)
      ctx.addIssue({ code: 'custom', path: ['members'], message: '프라이빗 라운딩은 참가자를 1명 이상 지정해야 합니다' });
  });

export type RoundValues = z.infer<typeof roundSchema>;
export const ROUND_FIELDS = Object.keys(roundSchema.innerType().shape);

const money = (v: number | null | undefined) => (v ? String(Math.round(v)) : '');

export function toRoundValues(r?: RoundDetail, participants: Participant[] = []): RoundValues {
  const active = participants.filter((p) => p.status !== 'CANCELED');
  return {
    meeting_subtype: (r?.meeting_subtype as RoundValues['meeting_subtype']) ?? 'REGULAR',
    is_private: r?.is_private ?? false,
    name: r?.name ?? '',
    description: r?.description ?? '',
    location: r?.location ?? '',
    club_id: r ? String(r.club_id) : '',
    meeting_time: r?.meeting_time?.slice(0, 16) ?? '',
    application_deadline: r?.application_deadline?.slice(0, 16) ?? '',
    members: active.filter((p) => !p.is_guest && p.user_id).map((p) => ({ user_id: p.user_id!, nickname: p.user_nickname })),
    guests: active
      .filter((p) => p.is_guest)
      .map((p) => ({
        name: p.user_name,
        birthdate: p.guest_birthdate ?? '',
        gender: p.guest_gender ?? '',
        average_score: p.guest_handicap != null ? String(Math.round(p.guest_handicap + 72)) : '',
      })),
    course_name: r?.course_name ?? '',
    reservation_name: r?.reservation_name ?? '',
    hole_count: String(r?.hole_count ?? 18),
    tee_times: (r?.tee_times.length ? r.tee_times : ['']).map((value) => ({ value })),
    max_participants: String(r?.max_participants ?? 8),
    team_size: String(r?.team_size && r.team_size >= 2 && r.team_size <= 4 ? r.team_size : 4) as RoundValues['team_size'],
    team_formation_mode: r?.team_formation_mode ?? 'GENDER_MIXED_HANDICAP',
    green_fee: money(r?.green_fee),
    caddy_fee: money(r?.caddy_fee),
    cart_fee: money(r?.cart_fee),
    settlement_method: r?.settlement_method ?? 'EQUAL_SPLIT',
    participantsEditable: !r || r.status === 'SCHEDULED',
  };
}

type Body = Record<string, unknown>;

function fullBody(v: RoundValues): Body {
  const num = (s: string) => (s === '' ? 0 : Number(s));
  return {
    meeting_subtype: v.meeting_subtype,
    is_private: v.is_private,
    name: v.name.trim(),
    description: v.description.trim() || null,
    location: v.location.trim() || null,
    club_id: Number(v.club_id),
    meeting_time: v.meeting_time,
    application_deadline: v.application_deadline,
    course_name: v.course_name.trim() || null,
    reservation_name: v.reservation_name.trim() || null,
    hole_count: Number(v.hole_count),
    tee_times: v.tee_times.map((t) => t.value).filter(Boolean),
    max_participants: Number(v.max_participants),
    team_size: Number(v.team_size),
    team_formation_mode: v.team_formation_mode,
    green_fee: num(v.green_fee),
    caddy_fee: num(v.caddy_fee),
    cart_fee: num(v.cart_fee),
    settlement_method: v.settlement_method,
    selected_participants: v.members.map((m) => m.user_id),
    selected_guests: v.guests.map((g) => ({
      name: g.name.trim(),
      birthdate: g.birthdate || null,
      gender: g.gender || null,
      average_score: g.average_score ? Number(g.average_score) : null,
      handicap: g.average_score ? Math.max(0, Number(g.average_score) - 72) : null,
    })),
  };
}

/**
 * 폼 값 → API 본문.
 * 등록: 전체 (공개 라운딩이면 참가자 목록은 백엔드가 무시한다).
 * 수정: 바뀐 항목만. 참가자는 편집 가능할 때 바뀌었으면 명단 전체를 보낸다 (백엔드가 동기화).
 */
export function toRoundBody(v: RoundValues, dirty?: Partial<Record<keyof RoundValues, unknown>>): Body {
  const all = fullBody(v);
  if (!dirty) {
    if (!v.is_private) {
      delete all.selected_participants;
      delete all.selected_guests;
    }
    return all;
  }
  const out: Body = {};
  for (const k of Object.keys(dirty) as (keyof RoundValues)[]) {
    if (k === 'members' || k === 'guests' || k === 'participantsEditable') continue;
    if (k in all) out[k] = all[k];
  }
  if (v.is_private && v.participantsEditable && (dirty.members || dirty.guests || dirty.is_private)) {
    out.selected_participants = all.selected_participants;
    out.selected_guests = all.selected_guests;
  }
  return out;
}

/** 금액 입력 표시 (천 단위 콤마) */
export const formatMoneyInput = (digitsOnly: string) => (digitsOnly ? Number(digitsOnly).toLocaleString('ko-KR') : '');
