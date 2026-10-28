import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, type Query } from '@/lib/api/client';
import { toPage, type Page } from '@/lib/api/envelope';
import { toApiQuery, type ListState } from './listState';

/**
 * 목록 조회. 쿼리 키 = [도메인, 목록 상태] 이므로 URL 이 바뀌면 다시 조회하고,
 * 이전 데이터는 유지해 깜빡이지 않는다 (F-001).
 */
export function useListQuery<T>(
  key: string,
  path: string,
  state: ListState,
  opts: {
    extraQuery?: Record<string, string | number | undefined>;
    enabled?: boolean;
    /** 정규화 전 엔드포인트의 파라미터 이름 변환 (BE#46 전환기). 도메인 api.ts 에 둔다 */
    mapQuery?: (q: Record<string, unknown>) => Record<string, unknown>;
  } = {},
) {
  return useQuery<Page<T>>({
    queryKey: [key, 'list', path, state, opts.extraQuery ?? {}],
    queryFn: async ({ signal }) => {
      // limit: 정규화 전 백엔드(BE#46)는 페이지 크기를 limit 으로 받는다. 정규화 후 제거
      const base = { ...toApiQuery(state), limit: state.size, ...opts.extraQuery };
      const query = (opts.mapQuery ? opts.mapQuery(base) : base) as Query;
      const raw = await api<unknown>(path, { query, signal });
      return toPage<T>(raw, state);
    },
    placeholderData: keepPreviousData,
    enabled: opts.enabled,
  });
}
