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

// Helper: parse content that might be legacy plain-text or Tiptap JSON
function parseContent(raw: string): string | object {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'doc') return parsed;
  } catch { /* not JSON — treat as plain text */ }
  return raw;
}

// Helper to extract plain text from Tiptap JSON node
function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join('\n');
  }
  return '';
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
// Slash command panel options
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
  const [editMode, setEditMode] = useState<'rich' | 'markdown'>('rich');
  const [markdownText, setMarkdownText] = useState('');
  
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (editMode === 'rich') {
        onChange(JSON.stringify(editor.getJSON()), editor.getText());
      }
    },
  });

  // Bi-directional content sync for external changes
  useEffect(() => {
    if (!editor) return;
    const parsed = parseContent(content);
    if (editMode === 'rich') {
      const current = JSON.stringify(editor.getJSON());
      const incoming = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      if (current !== incoming) {
        editor.commands.setContent(parsed as any);
      }
    } else {
      setMarkdownText(extractText(parsed));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editMode]);

  // Mode switcher handler
  const handleModeToggle = (mode: 'rich' | 'markdown') => {
    if (mode === editMode) return;
    if (mode === 'markdown') {
      if (editor) {
        const text = editor.getText();
        setMarkdownText(text);
        onChange(text, text);
      }
    } else {
      if (editor) {
        editor.commands.setContent(markdownText);
        onChange(JSON.stringify(editor.getJSON()), editor.getText());
      }
    }
    setEditMode(mode);
  };

  const handleMarkdownChange = (val: string) => {
    setMarkdownText(val);
    onChange(val, val);
  };

  // Cursor-aware markdown formatting inserter helper
  const insertMarkdown = (syntax: string, selectionPlaceholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const selected = text.substring(start, end) || selectionPlaceholder;

    const replacement = syntax.includes('$1') 
      ? syntax.replace('$1', selected) 
      : syntax + selected;

    const nextText = before + replacement + after;
    handleMarkdownChange(nextText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.indexOf(selected);
      textarea.setSelectionRange(newCursorPos, newCursorPos + selected.length);
    }, 0);
  };

  // -------------------------------------------------------------------------
  // Slash command logic
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editMode === 'markdown') return;
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
    [showSlash, slashIndex, slashFilter, editor, editMode],
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
      {/* 1. Mode Switcher (Pill Slider) */}
      {!readOnly && (
        <div className="flex justify-end mb-3">
          <div className="flex bg-[#F2F2F7] dark:bg-[#2C2C2E] p-0.5 rounded-xl border border-black/5 dark:border-white/5 relative z-10">
            <button
              type="button"
              onClick={() => handleModeToggle('rich')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${editMode === 'rich' ? 'bg-white dark:bg-[#3A3A3C] text-[#007AFF] shadow-sm' : 'text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white'}`}
            >
              Rich Text
            </button>
            <button
              type="button"
              onClick={() => handleModeToggle('markdown')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${editMode === 'markdown' ? 'bg-white dark:bg-[#3A3A3C] text-[#007AFF] shadow-sm' : 'text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white'}`}
            >
              Markdown
            </button>
          </div>
        </div>
      )}

      {/* 2. Editor Core body selection based on editMode */}
      {editMode === 'rich' ? (
        <>
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

          {/* Rich text TipTap body */}
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
        </>
      ) : (
        /* Markdown Editor Mode */
        <div className="capsule-markdown-editor border border-black/5 dark:border-white/5 rounded-2xl bg-white dark:bg-[#1C1C1E] overflow-hidden shadow-sm">
          {/* Markdown formatting Inserter Bar */}
          {!readOnly && (
            <div className="flex items-center gap-1 p-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] border-b border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => insertMarkdown('# $1', 'Heading 1')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all font-bold text-xs"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('## $1', 'Heading 2')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all font-bold text-xs"
                title="Heading 2"
              >
                H2
              </button>
              <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
              <button
                type="button"
                onClick={() => insertMarkdown('**$1**', 'bold text')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all"
                title="Bold"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*$1*', 'italic text')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all"
                title="Italic"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('- $1', 'List item')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all"
                title="Bullet List"
              >
                <List size={13} />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('> $1', 'Blockquote')}
                className="p-1.5 bg-white dark:bg-[#1C1C1E] hover:bg-[#F2F2F7] dark:hover:bg-[#3A3A3C] rounded-lg border border-black/5 dark:border-white/5 text-[#555] dark:text-[#F2F2F7] transition-all"
                title="Quote"
              >
                <Quote size={13} />
              </button>
            </div>
          )}

          {/* Raw Textarea input */}
          <textarea
            ref={textareaRef}
            value={markdownText}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            placeholder="Write raw thoughts or Markdown..."
            disabled={readOnly}
            className="w-full min-h-[220px] bg-transparent border-none outline-none resize-none text-[14px] font-semibold leading-relaxed text-[#1D1D1F] dark:text-[#F2F2F7] placeholder-[#8E8E93]/40 p-4 font-mono focus:ring-0 focus:border-none focus:outline-none"
          />
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
