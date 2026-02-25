import { Extension } from '@tiptap/core';
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

const CrossPlatformHistoryShortcuts = Extension.create({
  name: 'cross-platform-history-shortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-z': () => this.editor.commands.undo(),
      'Mod-Shift-z': () => this.editor.commands.redo(),
      'Mod-y': () => this.editor.commands.redo(),
      'Ctrl-z': () => this.editor.commands.undo(),
      'Ctrl-Shift-z': () => this.editor.commands.redo(),
      'Ctrl-y': () => this.editor.commands.redo(),
    };
  },
});

const EditableImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 420,
        parseHTML: (element) => {
          const value = element.getAttribute('data-width') ?? element.getAttribute('width');
          const parsed = Number(value);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 420;
        },
        renderHTML: (attributes) => {
          const width = Number(attributes.width) > 0 ? Number(attributes.width) : 420;
          const offsetX = Number(attributes.offsetX);
          const transform = Number.isFinite(offsetX) && offsetX !== 0
            ? `transform:translateX(${offsetX}px);`
            : '';
          return {
            'data-width': String(width),
            style: `width:${width}px;max-width:100%;height:auto;${transform}`,
          };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => ({ 'data-align': String(attributes.align ?? 'center') }),
      },
      offsetX: {
        default: 0,
        parseHTML: (element) => {
          const parsed = Number(element.getAttribute('data-offset-x'));
          return Number.isFinite(parsed) ? parsed : 0;
        },
        renderHTML: (attributes) => {
          const offsetX = Number(attributes.offsetX);
          if (!Number.isFinite(offsetX) || offsetX === 0) return {};
          return { 'data-offset-x': String(offsetX) };
        },
      },
    };
  },
});

export function getTextEditorExtensions() {
  return [
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
    EditableImage,
    TaskList,
    TaskItem.configure({ nested: true }),
    Subscript,
    Superscript,
    CodeBlockLowlight.configure({ lowlight }),
    CrossPlatformHistoryShortcuts,
  ];
}
