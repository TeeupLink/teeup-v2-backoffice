import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { StickyNote } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/app/auth/useAuth';
import { DataTable } from '@/components/data-table/DataTable';
import { useListState } from '@/components/data-table/useListState';
import { Modal } from '@/components/dialog/Modal';
import { StatusBadge } from '@/components/display/StatusBadge';
import { toast } from '@/components/feedback/toast-store';
import { FormField } from '@/components/form/Form';
import { Textarea } from '@/components/form/controls';
import { Button } from '@/components/ui/Button';
import type { Page } from '@/lib/api/envelope';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format';
import { fetchUserClubs, updateMemberNote } from '../api';
import { CLUB_ROLE, CLUB_TYPE } from '@/features/clubs/labels';
import type { UserClub } from '../types';

const col = createColumnHelper<UserClub>();
const CONFIG = {};
const NOTE_MAX = 2000;

/** 클럽별 회원 메모 (F-034) */
function NoteModal({ userId, club, onClose }: { userId: number; club: UserClub; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(club.note ?? '');
  const save = useMutation({
    mutationFn: () => updateMemberNote(userId, club.id, note),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ['user', userId, 'clubs'] });
      toast.success(r.note ? '메모를 저장했습니다' : '메모를 지웠습니다');
      onClose();
    },
    onError: (e) => toast.error('메모를 저장하지 못했습니다', { description: errorMessage(e) }),
  });
  const tooLong = note.length > NOTE_MAX;
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${club.name} 메모`}
      description="앱의 구성원 메모와 같은 칸입니다. 이 클럽의 리더·매니저도 앱에서 봅니다."
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" loading={save.isPending} disabled={tooLong || note === (club.note ?? '')} onClick={() => save.mutate()}>
            저장
          </Button>
        </>
      }
    >
      <FormField label="메모" stacked error={tooLong ? `${NOTE_MAX.toLocaleString()}자 이하로 입력해주세요` : undefined}>
        {(p) => <Textarea {...p} rows={6} value={note} onChange={(e) => setNote(e.target.value)} placeholder="비우고 저장하면 메모를 지웁니다" />}
      </FormField>
      <p className="mt-1 text-right text-xs text-slate-500">
        {note.length.toLocaleString()} / {NOTE_MAX.toLocaleString()}
      </p>
    </Modal>
  );
}

/** 소속 클럽 (활동 중인 멤버십). API 가 전체를 한 번에 준다 */
export function ClubsTab({ userId }: { userId: number }) {
  const { can } = useAuth();
  const canWrite = can('users', 'write');
  const [editing, setEditing] = useState<UserClub | null>(null);
  const list = useListState(CONFIG);
  const query = useQuery({
    queryKey: ['user', userId, 'clubs'],
    queryFn: () => fetchUserClubs(userId),
    select: (d): Page<UserClub> => ({ items: d.clubs, total: d.clubs.length, page: 1, size: Math.max(d.clubs.length, 1) }),
  });
  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: '클럽',
        cell: ({ row }) => (
          <Link to={`/clubs/${row.original.id}`} className="font-medium text-slate-900 hover:underline">
            {row.original.name}
          </Link>
        ),
      }),
      col.accessor('type', { header: '유형', cell: (c) => CLUB_TYPE[c.getValue()] ?? c.getValue() }),
      col.accessor('location', { header: '지역', cell: (c) => c.getValue() ?? '-' }),
      col.accessor('member_role', { header: '역할', cell: (c) => CLUB_ROLE[c.getValue()] ?? c.getValue() }),
      col.accessor('status', { header: '클럽 상태', cell: (c) => <StatusBadge domain="club" value={c.getValue()} /> }),
      col.accessor('joined_at', { header: '가입일', cell: (c) => formatDate(c.getValue()) }),
      col.accessor('note', {
        header: '메모',
        cell: ({ row }) => (
          <div className="flex max-w-xs items-center gap-1">
            <span className="truncate text-slate-600" title={row.original.note ?? undefined}>
              {row.original.note ?? '-'}
            </span>
            {canWrite && (
              <Button size="sm" variant="ghost" aria-label={`${row.original.name} 메모`} onClick={() => setEditing(row.original)}>
                <StickyNote className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [canWrite],
  );
  return (
    <>
      <DataTable
        list={list}
        query={query}
        columns={columns}
        getRowId={(r) => r.id}
        rowHref={(r) => `/clubs/${r.id}`}
        empty={{ title: '소속 클럽이 없습니다' }}
      />
      {editing && <NoteModal userId={userId} club={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
