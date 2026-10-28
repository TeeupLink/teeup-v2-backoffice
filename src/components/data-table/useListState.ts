import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { applyPatch, hasActiveFilters, parseListState, serializeListState, type ListConfig, type ListPatch, type ListState } from './listState';

export type ListController = {
  state: ListState;
  config: ListConfig;
  /** replace=true 는 입력 중(디바운스 텍스트) — 뒤로가기 기록을 쌓지 않는다 */
  update: (patch: ListPatch, opts?: { replace?: boolean }) => void;
  reset: () => void;
  filtered: boolean;
};

export function useListState(config: ListConfig): ListController {
  const [sp, setSp] = useSearchParams();
  // config 는 화면마다 상수로 선언하므로 문자열 키로 안정화
  const configKey = JSON.stringify(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableConfig = useMemo(() => config, [configKey]);
  const state = useMemo(() => parseListState(sp, stableConfig), [sp, stableConfig]);

  const update = useCallback<ListController['update']>(
    (patch, opts) => {
      setSp((prev) => serializeListState(applyPatch(parseListState(prev, stableConfig), patch), stableConfig), {
        replace: opts?.replace,
      });
    },
    [setSp, stableConfig],
  );

  const reset = useCallback(() => setSp(new URLSearchParams()), [setSp]);

  return { state, config: stableConfig, update, reset, filtered: hasActiveFilters(state, stableConfig) };
}
