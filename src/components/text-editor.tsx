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
import { parseTextContent } from '@/lib/text-content';
import { calculatePageCount } from '@/lib/pagination';
import TextEditorToolbar from '@/components/editor/text-editor-toolbar';

import styles from './text-editor.module.css';

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function TextEditor({ content, onChange }: TextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pagedContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = React.useState(1);

  const schedulePagination = React.useCallback((editorRoot: HTMLElement | null) => {
    if (!editorRoot) return;
    const proseMirror = editorRoot.classList.contains('ProseMirror')
      ? editorRoot
      : (editorRoot.querySelector('.ProseMirror') as HTMLElement | null);
    if (!proseMirror) return;

    const children = Array.from(proseMirror.children) as HTMLElement[];
    const proseRect = proseMirror.getBoundingClientRect();
    const lastMeaningfulChild = [...children].reverse().find((child) => {
      const text = (child.textContent || '').replace(/\u200b/g, '').trim();
      if (text.length > 0) return true;
      return Boolean(
        child.querySelector('img, table, pre, hr, iframe, video, canvas, svg, input[type="checkbox"]')
      );
    });

    let measuredContentHeight = 0;
    if (lastMeaningfulChild) {
      const lastRect = lastMeaningfulChild.getBoundingClientRect();
      // Do not include trailing margin of the last block; it can create a phantom blank page.
      measuredContentHeight = Math.max(0, lastRect.bottom - proseRect.top);
    }

    const topAndBottomPadding = 170;
    const withSinglePagePadding = measuredContentHeight + topAndBottomPadding;
    const correctedPageCount = calculatePageCount(withSinglePagePadding, {
      pageHeight: 1123,
      overflowTolerance: 8,
    });
    setPageCount((prev) => (prev === correctedPageCount ? prev : correctedPageCount));
  }, []);

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
    content: parseTextContent(content),
    onCreate: ({ editor }) => {
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    },
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    },
  }, [content, onChange, schedulePagination]);

  React.useEffect(() => {
    if (!editor || !pagedContainerRef.current) return;
    schedulePagination(pagedContainerRef.current);
  }, [editor, schedulePagination, content]);

  React.useEffect(() => {
    if (!editor || !pagedContainerRef.current) return;
    const proseMirror = pagedContainerRef.current.querySelector('.ProseMirror') as HTMLElement | null;
    if (!proseMirror || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    });

    observer.observe(proseMirror);
    return () => observer.disconnect();
  }, [editor, schedulePagination]);

  React.useEffect(() => {
    if (!editor || !pagedContainerRef.current) return;
    const onResize = () => {
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [editor, schedulePagination]);

  if (!editor) return null;

  const pageHeight = 1123;
  const pageGap = 12;
  const documentHeight = (pageCount * pageHeight) + ((pageCount - 1) * pageGap);
  const pageMarkers = Array.from({ length: pageCount }, (_, i) => ({
    page: i + 1,
    top: (i * (pageHeight + pageGap)) + pageHeight - 22,
  }));

  return (
    <div className={styles.editorContainer}>
      <TextEditorToolbar editor={editor} fileInputRef={fileInputRef} />

      <div className={styles.scrollArea}>
        <div
          id="print-content"
          ref={pagedContainerRef}
          data-paged-document="true"
          className={styles.pagedDocument}
          style={
            {
              '--page-gap': `${pageGap}px`,
              height: `${documentHeight}px`,
            } as React.CSSProperties
          }
        >
          <EditorContent editor={editor} className={styles.editorCore} style={{ minHeight: `${documentHeight}px` }} />
          <div className={styles.pageMarkers} aria-hidden="true">
            {pageMarkers.map((marker) => (
              <div key={marker.page} className={styles.pageMarker} style={{ top: `${marker.top}px` }}>
                p.{marker.page}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
