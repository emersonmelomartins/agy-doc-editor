import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code as CodeIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
  Upload,
} from 'lucide-react';
import styles from '@/components/text-editor.module.css';
import ToolbarIconButton from './toolbar-icon-button';

type TextEditorToolbarProps = {
  editor: Editor;
  fileInputRef: React.RefObject<HTMLInputElement>;
};

type ToolbarAction = {
  key: string;
  label: string;
  title?: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  tooltip?: boolean;
  onClick: () => void;
};

function renderActions(actions: ToolbarAction[]) {
  return actions.map((action) => (
    <ToolbarIconButton
      key={action.key}
      label={action.label}
      title={action.title}
      active={action.active}
      disabled={action.disabled}
      onClick={action.onClick}
      withTooltip={action.tooltip}
    >
      {action.icon}
    </ToolbarIconButton>
  ));
}

export default function TextEditorToolbar({ editor, fileInputRef }: TextEditorToolbarProps) {
  const historyActions: ToolbarAction[] = [
    {
      key: 'undo',
      label: 'Desfazer',
      title: 'Desfazer (Ctrl+Z)',
      icon: <Undo size={16} />,
      disabled: !editor.can().undo(),
      tooltip: true,
      onClick: () => editor.chain().focus().undo().run(),
    },
    {
      key: 'redo',
      label: 'Refazer',
      title: 'Refazer (Ctrl+Y)',
      icon: <Redo size={16} />,
      disabled: !editor.can().redo(),
      tooltip: true,
      onClick: () => editor.chain().focus().redo().run(),
    },
  ];

  const textStyleActions: ToolbarAction[] = [
    {
      key: 'bold',
      label: 'Negrito',
      title: 'Negrito (Ctrl+B)',
      icon: <Bold size={16} />,
      active: editor.isActive('bold'),
      tooltip: true,
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      label: 'Italico',
      title: 'Italico (Ctrl+I)',
      icon: <Italic size={16} />,
      active: editor.isActive('italic'),
      tooltip: true,
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      label: 'Sublinhado',
      title: 'Sublinhado (Ctrl+U)',
      icon: <UnderlineIcon size={16} />,
      active: editor.isActive('underline'),
      tooltip: true,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'strike',
      label: 'Tachado',
      icon: <Strikethrough size={16} />,
      active: editor.isActive('strike'),
      tooltip: true,
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
  ];

  const alignActions: ToolbarAction[] = [
    {
      key: 'align-left',
      label: 'Alinhar a esquerda',
      icon: <AlignLeft size={16} />,
      active: editor.isActive({ textAlign: 'left' }),
      onClick: () => editor.chain().focus().setTextAlign('left').run(),
    },
    {
      key: 'align-center',
      label: 'Centralizar',
      icon: <AlignCenter size={16} />,
      active: editor.isActive({ textAlign: 'center' }),
      onClick: () => editor.chain().focus().setTextAlign('center').run(),
    },
    {
      key: 'align-right',
      label: 'Alinhar a direita',
      icon: <AlignRight size={16} />,
      active: editor.isActive({ textAlign: 'right' }),
      onClick: () => editor.chain().focus().setTextAlign('right').run(),
    },
    {
      key: 'align-justify',
      label: 'Justificar',
      icon: <AlignJustify size={16} />,
      active: editor.isActive({ textAlign: 'justify' }),
      onClick: () => editor.chain().focus().setTextAlign('justify').run(),
    },
  ];

  const listActions: ToolbarAction[] = [
    {
      key: 'bullet-list',
      label: 'Lista com marcadores',
      icon: <List size={16} />,
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'ordered-list',
      label: 'Lista numerada',
      icon: <ListOrdered size={16} />,
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      key: 'task-list',
      label: 'Lista de tarefas',
      icon: <CheckSquare size={16} />,
      active: editor.isActive('taskList'),
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },
  ];

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Barra de ferramentas de edição">
      <div className={styles.toolbarGroup}>{renderActions(historyActions)}</div>
      <div className={styles.toolbarGroup}>{renderActions(textStyleActions)}</div>
      <div className={styles.toolbarGroup}>{renderActions(alignActions)}</div>

      <div className={styles.toolbarGroup}>
        <div className="tooltip">
          <input
            type="color"
            onInput={(event) =>
              editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()
            }
            value={editor.getAttributes('textStyle').color || '#000000'}
            className={styles.colorPicker}
            aria-label="Cor do texto"
            title="Cor do texto"
          />
          <span className="tooltip-text">Cor do Texto</span>
        </div>
      </div>

      <div className={styles.toolbarGroup}>{renderActions(listActions)}</div>

      <div className={styles.toolbarGroup}>
        <ToolbarIconButton
          label="Titulo H1"
          title="Titulo H1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Titulo H2"
          title="Titulo H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Titulo H3"
          title="Titulo H3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Sobrescrito"
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SuperscriptIcon size={14} />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Subscrito"
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <SubscriptIcon size={14} />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Bloco de codigo"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeIcon size={16} />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Linha horizontal"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={16} />
        </ToolbarIconButton>
      </div>

      <div className={styles.toolbarGroup}>
        <ToolbarIconButton
          label="Inserir imagem por URL"
          title="Imagem por URL"
          withTooltip
          onClick={() => {
            const url = window.prompt('URL da imagem:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
        >
          <LinkIcon size={16} />
        </ToolbarIconButton>
        <ToolbarIconButton
          label="Upload de imagem"
          title="Upload local"
          withTooltip
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
        </ToolbarIconButton>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          aria-label="Selecionar imagem para upload"
          title="Selecionar imagem para upload"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
              const result = readerEvent.target?.result as string;
              editor.chain().focus().setImage({ src: result }).run();
            };
            reader.readAsDataURL(file);
          }}
        />
      </div>

      <div className={styles.toolbarGroup}>
        <ToolbarIconButton
          label="Inserir tabela"
          title="Inserir tabela"
          active={editor.isActive('table')}
          withTooltip
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon size={16} />
        </ToolbarIconButton>
        {editor.isActive('table') && (
          <>
            <ToolbarIconButton
              label="Adicionar coluna"
              title="Adicionar coluna"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              +Col
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Adicionar linha"
              title="Adicionar linha"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              +Lin
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Remover tabela"
              title="Remover tabela"
              className="btn-danger"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              RemTab
            </ToolbarIconButton>
          </>
        )}
      </div>
    </div>
  );
}
