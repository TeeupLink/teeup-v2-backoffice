import { z } from 'zod';
import type { UserInput } from './api';
import type { UserDetail } from './types';

// SCR-031 회원 폼 스키마·변환 (UserFormPage)

const optionalNumber = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max), `${label}는 ${min}~${max} 사이로 입력해주세요`);

const base = {
  email: z.string().trim().min(1, '이메일을 입력해주세요').email('이메일 형식이 아닙니다'),
  password: z.string(),
  realname: z
    .string()
    .trim()
    .min(2, '실명은 2자 이상입니다')
    .refine((v) => /^[가-힣]+$/.test(v) || /^[A-Za-z ]+$/.test(v), '한글(공백 없이) 또는 영문으로 입력해주세요'),
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요'),
  phone_number: z.string().trim(),
  birthdate: z.string(),
  gender: z.string(),
  average_score_init: optionalNumber(55, 144, '평균스코어'),
  handicap_init: optionalNumber(0, 72, '핸디캡'),
  status: z.enum(['ACTIVE', 'DEACTIVATED']),
  reason: z.string().trim().max(500),
};

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
export const createSchema = z.object({ ...base, password: z.string().regex(PASSWORD_RULE, '8자 이상, 영문·숫자·특수문자를 모두 포함해주세요') });
export const editSchema = z.object(base);
export type Values = z.infer<typeof editSchema>;
export const FIELDS = Object.keys(base);

/** 비밀번호 강도 — 길이·영문·숫자·특수 충족 개수 */
export function passwordStrength(pw: string): { score: number; label: string } {
  const score = [pw.length >= 8, /[A-Za-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length + (pw.length >= 12 ? 1 : 0);
  return { score, label: score >= 5 ? '강함' : score === 4 ? '보통' : '약함' };
}

export const handicapFrom = (avg: string) => String(Math.min(72, Math.max(0, Math.round((Number(avg) - 72) * 10) / 10)));

export function toValues(u?: UserDetail): Values {
  return {
    email: u?.email ?? '',
    password: '',
    realname: u?.realname ?? '',
    nickname: u?.nickname ?? '',
    phone_number: u?.phone_number ?? '',
    birthdate: u?.birthdate?.slice(0, 10) ?? '',
    gender: u?.gender ?? '',
    average_score_init: u?.average_score_init != null ? String(u.average_score_init) : '',
    handicap_init: u?.handicap_init != null ? String(u.handicap_init) : '',
    status: u?.status === 'DEACTIVATED' ? 'DEACTIVATED' : 'ACTIVE',
    reason: '',
  };
}

/** 폼 값 → API 본문. 빈 칸은 null(비움). 수정은 바뀐 항목만 */
export function toBody(v: Values, only?: Partial<Record<keyof Values, unknown>>): UserInput {
  const all: UserInput = {
    email: v.email.trim(),
    password: v.password || undefined,
    realname: v.realname.trim(),
    nickname: v.nickname.trim(),
    phone_number: v.phone_number.trim() || null,
    birthdate: v.birthdate || null,
    gender: v.gender || null,
    average_score_init: v.average_score_init ? Number(v.average_score_init) : null,
    handicap_init: v.handicap_init ? Number(v.handicap_init) : null,
    status: v.status,
    reason: v.reason.trim() || undefined,
  };
  const out: Record<string, unknown> = {};
  if (!only) {
    for (const k of Object.keys(all) as (keyof UserInput)[]) if (k !== 'status' && k !== 'reason') out[k] = all[k];
    return out as UserInput;
  }
  for (const k of Object.keys(only) as (keyof UserInput)[]) if (k !== 'password' && k !== 'reason') out[k] = all[k];
  if (all.reason) out.reason = all.reason;
  return out as UserInput;
}
