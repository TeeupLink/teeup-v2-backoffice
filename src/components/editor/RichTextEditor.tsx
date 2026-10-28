import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from '@/components/feedback/toast-store';
import { api } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { cn } from '@/lib/cn';

const MAX_IMAGE = 10 * 1024 * 1024;

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 이미지 업로드 경로 (기본 /admin/upload). 응답에서 url 을 읽는다 */
  uploadPath?: string;
  invalid?: boolean;
  id?: string;
};

async function uploadImage(file: File, path: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api<{ url?: string; file_url?: string; data?: { url?: string } }>(path, { method: 'POST', body: fd });
  const url = res.url ?? res.file_url ?? res.data?.url;
  if (!url) throw new Error('업로드 응답에 URL 이 없습니다');
  return url;
}

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn('rounded p-1.5 text-slate-600 hover:bg-slate-100', active && 'bg-slate-200 text-slate-900')}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('링크 주소', prev ?? 'https://');
    if (url === null) return;
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap gap-0.5 border-b border-slate-200 px-1.5 py-1" role="toolbar" aria-label="서식">
      <ToolButton label="굵게" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></ToolButton>
      <ToolButton label="기울임" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolButton>
      <ToolButton label="제목" active={editor.isActive('heading', { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
      <ToolButton label="글머리 목록" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
      <ToolButton label="번호 목록" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
      <ToolButton label="인용" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolButton>
      <ToolButton label="링크" active={editor.isActive('link')} onClick={setLink}><Link2 className="h-4 w-4" /></ToolButton>
      <ToolButton label="이미지" onClick={onImage}><ImagePlus className="h-4 w-4" /></ToolButton>
      <span className="mx-1 w-px bg-slate-200" aria-hidden />
      <ToolButton label="실행 취소" onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
      <ToolButton label="다시 실행" onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
    </div>
  );
}

/** 공지·클럽 공지·규정·FAQ·약관 공통 에디터 (REQ-013, F-007) */
export default function RichTextEditor({ value, onChange, placeholder, uploadPath = '/admin/upload', invalid, id }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? '내용을 입력하세요' }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: { attributes: { class: 'rt-content min-h-[240px] px-4 py-3 focus:outline-none', ...(id ? { id } : {}) } },
  });

  // 외부에서 값이 바뀌면(수정 화면 초기 로드) 반영
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === '' && editor.isEmpty)) editor.commands.setContent(value, false);
  }, [editor, value]);

  const onFile = async (file: File | undefined) => {
    if (!file || !editor) return;
    if (file.size > MAX_IMAGE) return void toast.error('이미지는 10MB 이하만 올릴 수 있습니다');
    try {
      const url = await uploadImage(file, uploadPath);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (e) {
      toast.error('이미지를 올리지 못했습니다', { description: errorMessage(e) });
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20', invalid ? 'border-red-500' : 'border-slate-300')}>
      {editor && <Toolbar editor={editor} onImage={() => fileRef.current?.click()} />}
      <EditorContent editor={editor} />
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
    </div>
  );
}
