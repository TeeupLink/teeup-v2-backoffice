import type { ConfirmOptions } from '@/components/dialog/confirm-store';

export type RowId = string | number;

/** 공통 일괄 응답 (API스펙 1.2) */
export type BulkResult = { succeeded: RowId[]; failed: { id: RowId; message: string }[] };

export type BulkAction = {
  key: string;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
  /** 있으면 실행 전에 확인 대화상자. reason 은 run 으로 전달 */
  confirm?: (count: number) => ConfirmOptions;
  run: (ids: RowId[], reason: string | undefined) => Promise<BulkResult>;
};

/**
 * bulk API 가 아직 없는 도메인용(전환기) — 건별 호출을 공통 형식으로 집계한다.
 * 한 건 실패가 나머지를 막지 않는다.
 */
export async function runSequential(ids: RowId[], fn: (id: RowId) => Promise<unknown>, errorText: (e: unknown) => string): Promise<BulkResult> {
  const result: BulkResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    try {
      await fn(id);
      result.succeeded.push(id);
    } catch (e) {
      result.failed.push({ id, message: errorText(e) });
    }
  }
  return result;
}
