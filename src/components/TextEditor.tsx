'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';

import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Table as TableIcon,
  Link as LinkIcon,
  Highlighter,
  Palette,
  Undo,
  Redo,
  AlignJustify,
  Image as ImageIcon,
  Heading3,
  CheckSquare,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Code as CodeIcon,
  Quote,
  Minus,
  TableProperties,
  Upload
} from 'lucide-react';

import styles from './TextEditor.module.css';

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function TextEditor({ content, onChange }: TextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        editor.chain().focus().setImage({ src: result }).run();
      };
      reader.readAsDataURL(file);
    }
  };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, 
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Comece a escrever...' }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: JSON.parse(content || '{}'),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
  });

  if (!editor) return null;

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar} role="toolbar" aria-label="Barra de ferramentas de edição">
        {/* History Group */}
        <div className={styles.toolbarGroup}>
          <div className="tooltip">
            <button className="btn-icon" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} aria-label="Desfazer">
              <Undo size={16} />
            </button>
            <span className="tooltip-text">Desfazer (Ctrl+Z)</span>
          </div>
          <div className="tooltip">
            <button className="btn-icon" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} aria-label="Refazer">
              <Redo size={16} />
            </button>
            <span className="tooltip-text">Refazer (Ctrl+Y)</span>
          </div>
        </div>

        {/* Basic Styles Group */}
        <div className={styles.toolbarGroup}>
          <div className="tooltip">
            <button 
              className={`btn-icon ${editor.isActive('bold') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              aria-label="Negrito"
            >
              <Bold size={16} />
            </button>
            <span className="tooltip-text">Negrito (Ctrl+B)</span>
          </div>
          <div className="tooltip">
            <button 
              className={`btn-icon ${editor.isActive('italic') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              aria-label="Itálico"
            >
              <Italic size={16} />
            </button>
            <span className="tooltip-text">Itálico (Ctrl+I)</span>
          </div>
          <div className="tooltip">
            <button 
              className={`btn-icon ${editor.isActive('underline') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              aria-label="Sublinhado"
            >
              <UnderlineIcon size={16} />
            </button>
            <span className="tooltip-text">Sublinhado (Ctrl+U)</span>
          </div>
          <div className="tooltip">
            <button 
              className={`btn-icon ${editor.isActive('strike') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              aria-label="Tachado"
            >
              <Strikethrough size={16} />
            </button>
            <span className="tooltip-text">Tachado</span>
          </div>
        </div>

        {/* Alignment Group */}
        <div className={styles.toolbarGroup}>
          <button 
            className={`btn-icon ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            aria-label="Alinhar à esquerda"
          >
            <AlignLeft size={16} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            aria-label="Centralizar"
          >
            <AlignCenter size={16} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            aria-label="Alinhar à direita"
          >
            <AlignRight size={16} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            aria-label="Justificar"
          >
            <AlignJustify size={16} />
          </button>
        </div>

        {/* Color Group */}
        <div className={styles.toolbarGroup}>
          <div className="tooltip">
            <input
              type="color"
              onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              value={editor.getAttributes('textStyle').color || '#000000'}
              className={styles.colorPicker}
              aria-label="Cor do texto"
            />
            <span className="tooltip-text">Cor do Texto</span>
          </div>
        </div>

        {/* Lists Group */}
        <div className={styles.toolbarGroup}>
          <button 
            className={`btn-icon ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Lista com marcadores"
          >
            <List size={16} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Lista numerada"
          >
            <ListOrdered size={16} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive('taskList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            aria-label="Lista de tarefas"
          >
            <CheckSquare size={16} />
          </button>
        </div>

        {/* Advanced Formatting Group */}
        <div className={styles.toolbarGroup}>
          <button 
            className={`btn-icon ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button 
            className={`btn-icon ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button 
            className={`btn-icon ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
          <button 
            className={`btn-icon ${editor.isActive('superscript') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            aria-label="Sobrescrito"
          >
            <SuperscriptIcon size={14} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive('subscript') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            aria-label="Subscrito"
          >
            <SubscriptIcon size={14} />
          </button>
          <button 
            className={`btn-icon ${editor.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            aria-label="Bloco de código"
          >
            <CodeIcon size={16} />
          </button>
          <button 
            className="btn-icon" 
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            aria-label="Linha horizontal"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* Media Group */}
        <div className={styles.toolbarGroup}>
          <div className="tooltip">
            <button 
              className="btn-icon" 
              onClick={() => {
                const url = window.prompt('URL da imagem:');
                if (url) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }}
              aria-label="Inserir imagem por URL"
            >
              <LinkIcon size={16} />
            </button>
            <span className="tooltip-text">Imagem por URL</span>
          </div>

          <div className="tooltip">
            <button 
              className="btn-icon" 
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload de imagem"
            >
              <Upload size={16} />
            </button>
            <span className="tooltip-text">Upload Local</span>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>

        {/* Table Group */}
        <div className={styles.toolbarGroup}>
          <div className="tooltip">
            <button 
              className={`btn-icon ${editor.isActive('table') ? 'active' : ''}`}
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              aria-label="Inserir tabela"
            >
              <TableIcon size={16} />
            </button>
            <span className="tooltip-text">Inserir Tabela</span>
          </div>
          {editor.isActive('table') && (
            <>
              <button title="Adicionar Coluna" className="btn-icon" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</button>
              <button title="Adicionar Linha" className="btn-icon" onClick={() => editor.chain().focus().addRowAfter().run()}>+Lin</button>
              <button title="Remover Tabela" className="btn-icon btn-danger" onClick={() => editor.chain().focus().deleteTable().run()}>RemTab</button>
            </>
          )}
        </div>
      </div>

      <div className={styles.scrollArea}>
        <EditorContent editor={editor} className={styles.editorCore} />
      </div>
    </div>
  );
}
