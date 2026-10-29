import { z } from 'zod';
import type { SocialDetail } from './types';

// SCR-061 소셜 등록·수정 폼 스키마·변환 (SocialFormPage)

export const socialSchema = z
  .object({
    social_type: z.enum(['CASUAL', 'DINNER', 'EVENT']),
    name: z.string().trim().min(1, '모임명을 입력해주세요').max(100),
    description: z.string(),
    club_id: z.string().min(1, '클럽을 선택해주세요'),
    meeting_time: z.string().min(1, '일시를 입력해주세요'),
    application_deadline: z.string(),
    venue_name: z.string(),
    location: z.string(),
    unlimited: z.boolean(),
    max_participants: z.string(),
    social_cost: z.string().regex(/^\d*$/, '숫자만 입력해주세요'),
    settlement_method: z.string(),
    social_notes: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.meeting_time && v.application_deadline && v.application_deadline > v.meeting_time)
      ctx.addIssue({ code: 'custom', path: ['application_deadline'], message: '신청 마감은 모임 일시보다 앞서야 합니다' });
    if (!v.unlimited && !(/^\d+$/.test(v.max_participants) && Number(v.max_participants) >= 2 && Number(v.max_participants) <= 500))
      ctx.addIssue({ code: 'custom', path: ['max_participants'], message: '최대 인원은 2~500 사이입니다' });
  });

export type SocialValues = z.infer<typeof socialSchema>;
export const SOCIAL_FIELDS = Object.keys(socialSchema.innerType().shape);

export function toSocialValues(s?: SocialDetail): SocialValues {
  return {
    social_type: s?.social_type ?? 'CASUAL',
    name: s?.name ?? '',
    description: s?.description ?? '',
    club_id: s ? String(s.club_id) : '',
    meeting_time: s?.meeting_time?.slice(0, 16) ?? '',
    application_deadline: s?.application_deadline?.slice(0, 16) ?? '',
    venue_name: s?.venue_name ?? '',
    location: s?.location ?? '',
    // 예전 화면은 인원 제한 없음을 0 으로 저장했다
    unlimited: !!s && !s.max_participants,
    max_participants: s?.max_participants ? String(s.max_participants) : '10',
    social_cost: s?.social_cost ? String(Math.round(s.social_cost)) : '',
    settlement_method: s?.settlement_method ?? 'EQUAL_SPLIT',
    social_notes: s?.social_notes ?? '',
  };
}

type Body = Record<string, unknown>;

function fullBody(v: SocialValues): Body {
  return {
    social_type: v.social_type,
    name: v.name.trim(),
    description: v.description.trim() || null,
    club_id: Number(v.club_id),
    meeting_time: v.meeting_time,
    application_deadline: v.application_deadline || null,
    venue_name: v.venue_name.trim() || null,
    location: v.location.trim() || null,
    max_participants: v.unlimited ? 0 : Number(v.max_participants),
    social_cost: v.social_cost ? Number(v.social_cost) : null,
    settlement_method: v.settlement_method || null,
    social_notes: v.social_notes.trim() || null,
  };
}

/**
 * 폼 값 → API 본문.
 * 등록: 전체. 등록 API 는 유형을 `type` 으로 받는다.
 * 수정: 바뀐 항목만. 클럽은 수정 API 가 소셜에 대해 받지 않으므로 화면에서도 잠근다.
 */
export function toSocialBody(v: SocialValues, dirty?: Partial<Record<keyof SocialValues, unknown>>): Body {
  const all = fullBody(v);
  if (!dirty) {
    const { social_type, ...rest } = all;
    return { ...rest, type: social_type };
  }
  const out: Body = {};
  for (const k of Object.keys(dirty) as (keyof SocialValues)[]) {
    if (k === 'club_id') continue;
    if (k === 'unlimited') out.max_participants = all.max_participants;
    else if (k in all) out[k] = all[k];
  }
  return out;
}
