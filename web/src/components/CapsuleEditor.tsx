import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Type,
} from 'lucide-react';
import './CapsuleEditor.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CapsuleEditorProps {
  /** Initial content — either a Tiptap JSON string or legacy plain text. */
  content: string;
  onChange: (json: string, text: string) => void;
  placeholder?: string;
  /** When true the editor is read-only (card preview mode). */
  readOnly?: boolean;
  /** Autofocus the editor on mount. */
  autoFocus?: boolean;
}

// ---------------------------------------------------------------------------
// Helper: parse content that might be legacy plain-text or Tiptap JSON
// ---------------------------------------------------------------------------
function parseContent(raw: string): string | object {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'doc') return parsed;
  } catch { /* not JSON — treat as plain text */ }
  return raw;
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------
function ToolBtn({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`capsule-editor-tool-btn${active ? ' active' : ''}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Slash command panel
// ---------------------------------------------------------------------------
const SLASH_ITEMS = [
  { label: 'Heading 1', icon: <Heading1 size={15} />, cmd: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', icon: <Heading2 size={15} />, cmd: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Normal text', icon: <Type size={15} />, cmd: (editor: any) => editor.chain().focus().setParagraph().run() },
  { label: 'Bullet list', icon: <List size={15} />, cmd: (editor: any) => editor.chain().focus().toggleBulletList().run() },
  { label: 'Ordered list', icon: <ListOrdered size={15} />, cmd: (editor: any) => editor.chain().focus().toggleOrderedList().run() },
  { label: 'Blockquote', icon: <Quote size={15} />, cmd: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
  { label: 'Insert image', icon: <ImageIcon size={15} />, cmd: (_editor: any, openImage: () => void) => openImage() },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CapsuleEditor({
  content,
  onChange,
  placeholder = 'Write your idea...',
  readOnly = false,
  autoFocus = false,
}: CapsuleEditorProps) {
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      ImageExtension.configure({ inline: false }),
      BubbleMenuExtension,
    ],
    content: parseContent(content) as any,
    editable: !readOnly,
    autofocus: autoFocus ? 'end' : false,
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()), editor.getText());
    },
  });

  // Keep external content changes in sync (e.g. switching capsules)
  useEffect(() => {
    if (!editor) return;
    const parsed = parseContent(content);
    const current = JSON.stringify(editor.getJSON());
    const incoming = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    if (current !== incoming) {
      editor.commands.setContent(parsed as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // -------------------------------------------------------------------------
  // Slash command logic
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === '/') {
        setShowSlash(true);
        setSlashFilter('');
        setSlashIndex(0);
        return;
      }
      if (!showSlash) return;
      if (e.key === 'Escape') { setShowSlash(false); return; }
      if (e.key === 'Backspace') {
        setSlashFilter(p => { if (p.length === 0) { setShowSlash(false); } return p.slice(0, -1); });
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % SLASH_ITEMS.length); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIndex(i => (i - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredSlash[slashIndex];
        if (item) {
          // Remove the slash character we typed
          editor?.chain().focus().deleteRange({
            from: editor.state.selection.from - 1 - slashFilter.length,
            to: editor.state.selection.from,
          }).run();
          item.cmd(editor, () => imageInputRef.current?.click());
          setShowSlash(false);
        }
        return;
      }
      if (e.key.length === 1) {
        setSlashFilter(p => p + e.key);
      }
    },
    [showSlash, slashIndex, slashFilter, editor],
  );

  const filteredSlash = SLASH_ITEMS.filter(i =>
    i.label.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // -------------------------------------------------------------------------
  // Image insert via file input
  // -------------------------------------------------------------------------
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const insertImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const prev = editor?.getAttributes('link').href || '';
    const url = prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href: url }).run();
  };

  if (!editor) return null;

  return (
    <div className="capsule-editor-root" onKeyDown={handleKeyDown}>
      {/* Bubble Menu — appears when text is selected */}
      {!readOnly && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          className="capsule-bubble-menu"
        >
          <ToolBtn active={editor.isActive('bold')} title="Bold (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive('italic')} title="Italic (⌘I)" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive('underline')} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive('strike')} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></ToolBtn>
          <div className="capsule-bubble-divider" />
          <ToolBtn active={editor.isActive('heading', { level: 1 })} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive('heading', { level: 2 })} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></ToolBtn>
          <div className="capsule-bubble-divider" />
          <ToolBtn active={editor.isActive({ textAlign: 'left' })} title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'center' })} title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={14} /></ToolBtn>
          <ToolBtn active={editor.isActive({ textAlign: 'right' })} title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={14} /></ToolBtn>
          <div className="capsule-bubble-divider" />
          <ToolBtn active={editor.isActive('link')} title="Link" onClick={setLink}><LinkIcon size={14} /></ToolBtn>
          <ToolBtn active={false} title="Insert image" onClick={() => imageInputRef.current?.click()}><ImageIcon size={14} /></ToolBtn>
        </BubbleMenu>
      )}

      {/* Editor body */}
      <EditorContent editor={editor} className="capsule-editor-content" />

      {/* Slash command panel */}
      {showSlash && filteredSlash.length > 0 && (
        <div className="capsule-slash-panel">
          <div className="capsule-slash-hint">Type to filter · ↑↓ navigate · Enter select · Esc close</div>
          {filteredSlash.map((item, i) => (
            <button
              key={item.label}
              type="button"
              className={`capsule-slash-item${i === slashIndex ? ' active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                editor?.chain().focus().deleteRange({
                  from: editor.state.selection.from - 1 - slashFilter.length,
                  to: editor.state.selection.from,
                }).run();
                item.cmd(editor, () => imageInputRef.current?.click());
                setShowSlash(false);
              }}
            >
              <span className="capsule-slash-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom inline toolbar (always visible when not readOnly) */}
      {!readOnly && (
        <div className="capsule-editor-toolbar">
          <ToolBtn active={editor.isActive('bulletList')} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolBtn>
          <ToolBtn active={editor.isActive('orderedList')} title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolBtn>
          <ToolBtn active={editor.isActive('blockquote')} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolBtn>
          <div style={{ flex: 1 }} />
          <ToolBtn active={false} title="Insert image from file" onClick={() => imageInputRef.current?.click()}><ImageIcon size={15} /></ToolBtn>
          <ToolBtn active={false} title="Insert image from URL" onClick={insertImageUrl}><LinkIcon size={15} /></ToolBtn>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />
    </div>
  );
}
