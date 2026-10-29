import { useState } from 'react';
import { Modal } from '@/components/dialog/Modal';
import { FormField } from '@/components/form/Form';
import { Select } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import { toOptions } from '@/lib/labels';
import { FORMATION_MODE } from '../labels';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults: { mode: string | null; size: number | null };
  confirmed: number;
  hasTeams: boolean;
  running: boolean;
  onRun: (mode: string, size: number) => void;
};

/** 자동 편성 (F-053). 확정 4명 이상, 팀당 2~4명. 기존 편성은 덮어쓴다 */
export function AutoFormationModal({ open, onOpenChange, defaults, confirmed, hasTeams, running, onRun }: Props) {
  const [mode, setMode] = useState(defaults.mode && FORMATION_MODE[defaults.mode] ? defaults.mode : 'GENDER_MIXED_HANDICAP');
  const [size, setSize] = useState(String(defaults.size && defaults.size >= 2 && defaults.size <= 4 ? defaults.size : 4));
  const tooFew = confirmed < 4;
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="자동 편성"
      description={`확정 참가자 ${confirmed}명으로 팀을 만듭니다.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>취소</Button>
          <Button variant={hasTeams ? 'danger' : 'primary'} disabled={tooFew} loading={running} onClick={() => onRun(mode, Number(size))}>
            {hasTeams ? '기존 편성 지우고 실행' : '편성 실행'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {hasTeams && (
          <p role="alert" className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            지금 있는 팀과 배정이 모두 지워지고 새로 편성됩니다.
          </p>
        )}
        {tooFew && <p className="text-sm text-red-600">확정 참가자가 4명 이상이어야 합니다.</p>}
        <FormField label="편성 방식">
          {(p) => <Select {...p} value={mode} onChange={(e) => setMode(e.target.value)} options={toOptions(FORMATION_MODE)} />}
        </FormField>
        <FormField label="팀당 인원">
          {(p) => (
            <Select
              {...p}
              className="max-w-32"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              options={['2', '3', '4'].map((v) => ({
                value: v,
                label: `${v}명`,
              }))}
            />
          )}
        </FormField>
      </div>
    </Modal>
  );
}
