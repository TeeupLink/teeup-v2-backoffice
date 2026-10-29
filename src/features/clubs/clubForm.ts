import { z } from 'zod';
import type { ClubDetail } from './types';

// SCR-041 클럽 등록·수정 폼 스키마·변환 (ClubFormPage)

export const clubSchema = z
  .object({
    editing: z.boolean(),
    name: z.string().trim().min(2, '클럽명은 2자 이상입니다').max(50),
    description: z.string().trim().min(10, '설명은 10자 이상 입력해주세요'),
    type: z.enum(['REGULAR', 'IRREGULAR']),
    member_count: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000), '1~1000'),
    sido_code: z.string().min(1, '시도를 선택해주세요'),
    gungu_codes: z.array(z.string()).min(1, '군구를 1개 이상 선택해주세요').max(4, '군구는 4개까지 고를 수 있습니다'),
    contact_info: z.string().max(255),
    location: z.string().max(255),
    additional_info: z.string(),
    representative_id: z.string(),
    has_regular_fee: z.boolean(),
    fee_amount: z.string().regex(/^\d*$/),
    fee_cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
    fee_description: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.editing && !v.representative_id) ctx.addIssue({ code: 'custom', path: ['representative_id'], message: '대표자(리더)를 선택해주세요' });
    if (!v.editing && v.has_regular_fee && !Number(v.fee_amount)) ctx.addIssue({ code: 'custom', path: ['fee_amount'], message: '회비 금액을 입력해주세요' });
  });

export type ClubValues = z.infer<typeof clubSchema>;
export const CLUB_FIELDS = Object.keys(clubSchema.innerType().shape);

export function toClubValues(c?: ClubDetail): ClubValues {
  return {
    editing: !!c,
    name: c?.name ?? '',
    description: c?.description ?? '',
    type: c?.type ?? 'REGULAR',
    member_count: c?.member_count ? String(c.member_count) : '',
    sido_code: c?.sido_code ?? '',
    gungu_codes: c?.gungu_codes ?? [],
    contact_info: c?.contact_info ?? '',
    location: c?.location ?? '',
    additional_info: c?.additional_info ?? '',
    representative_id: '',
    has_regular_fee: false,
    fee_amount: '',
    fee_cycle: 'MONTHLY',
    fee_description: '',
  };
}

const BASE = ['name', 'description', 'type', 'contact_info', 'location', 'additional_info'] as const;

/** 등록: 전체 + 대표자·정기회비. 수정: 바뀐 항목만 (시도를 바꾸면 군구도 함께 — 백엔드 요구) */
export function toClubBody(v: ClubValues, dirty?: Partial<Record<keyof ClubValues, unknown>>): Record<string, unknown> {
  const all: Record<string, unknown> = {
    ...Object.fromEntries(BASE.map((k) => [k, v[k].trim()])),
    member_count: v.member_count ? Number(v.member_count) : undefined,
    sido_code: v.sido_code,
    gungu_codes: v.gungu_codes,
  };
  if (!dirty) {
    return {
      ...all,
      representative_id: Number(v.representative_id),
      ...(v.has_regular_fee ? { regular_fee: { amount: Number(v.fee_amount), cycle: v.fee_cycle, description: v.fee_description.trim() } } : {}),
    };
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(dirty)) if (k in all) out[k] = all[k];
  if (dirty.sido_code || dirty.gungu_codes) {
    out.sido_code = v.sido_code;
    out.gungu_codes = v.gungu_codes;
  }
  return out;
}
