import { Modal } from '@/components/dialog/Modal';
import { Button } from '@/components/ui/Button';
import type { BulkResult } from './bulk';

export function BulkFailureDialog({ failures, onClose }: { failures: BulkResult['failed'] | null; onClose: () => void }) {
  return (
    <Modal
      open={!!failures}
      onOpenChange={(o) => !o && onClose()}
      title={`실패 ${failures?.length ?? 0}건`}
      description="아래 항목은 처리되지 않았습니다. 사유를 확인하고 다시 시도하세요."
      footer={<Button onClick={onClose}>닫기</Button>}
    >
      <ul className="divide-y divide-slate-100 text-sm">
        {failures?.map((f) => (
          <li key={String(f.id)} className="flex gap-3 py-2">
            <span className="shrink-0 font-medium tabular text-slate-900">#{String(f.id)}</span>
            <span className="text-slate-600">{f.message}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
