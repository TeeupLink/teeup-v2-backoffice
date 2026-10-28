const KEY = 'teeup_admin_token';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    localStorage.setItem(KEY, token);
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 저장소 접근 불가 — 무시 */
    }
  },
};
