/**
 * 개인정보 표시 포맷터 (UI 규칙: 이름·전화·이메일은 반드시 여기를 거친다).
 * 마스킹 모드(F-131)가 켜지면 전 화면에 일괄 적용된다.
 */
const KEY = 'teeup_admin_mask';
type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let masked = read();

export const maskMode = {
  get: () => masked,
  set(on: boolean) {
    masked = on;
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
    } catch {
      /* 저장 실패해도 현재 화면에는 적용 */
    }
    listeners.forEach((l) => l(on));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function maskName(name: string): string {
  const chars = [...name.trim()];
  if (chars.length <= 1) return chars.length ? '*' : '';
  if (chars.length === 2) return `${chars[0]}*`;
  return chars[0] + '*'.repeat(chars.length - 2) + chars[chars.length - 1];
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

export function maskPhone(raw: string): string {
  const f = formatPhone(raw);
  const parts = f.split('-');
  if (parts.length === 3) return `${parts[0]}-${'*'.repeat(parts[1]!.length)}-${parts[2]}`;
  return f.replace(/\d(?=\d{4})/g, '*');
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const keep = local.length <= 2 ? 1 : 2;
  return `${local.slice(0, keep)}***${email.slice(at)}`;
}

type Kind = 'name' | 'phone' | 'email';

/** 표시용. null·빈 값은 '-' */
export function formatPII(kind: Kind, value: string | null | undefined, on = masked): string {
  if (!value) return '-';
  switch (kind) {
    case 'name':
      return on ? maskName(value) : value;
    case 'phone':
      return on ? maskPhone(value) : formatPhone(value);
    case 'email':
      return on ? maskEmail(value) : value;
  }
}
