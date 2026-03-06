import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Shrink,
  Expand,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { parseTextContent } from '@/utils/text-content';
import { calculatePageCount } from '@/utils/pagination';
import { getTextEditorExtensions } from '@/lib/text-editor-extensions';
import TextEditorToolbar from '@/components/editor/text-editor-toolbar';

import styles from './text-editor.module.css';

interface TextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const PAGE_HEIGHT = 1123;
const PAGE_GAP = 12;

export default function TextEditor({ content, onChange }: TextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const pagedContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement | null>(null);
  const lastEditorContentRef = React.useRef(content);
  const isInternalUpdateRef = React.useRef(false);
  const [pageCount, setPageCount] = React.useState(1);
  const [imageTools, setImageTools] = React.useState<{ top: number; left: number; visible: boolean }>({
    top: 0,
    left: 0,
    visible: false,
  });

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
      pageHeight: PAGE_HEIGHT,
      overflowTolerance: 8,
    });
    setPageCount((prev) => (prev === correctedPageCount ? prev : correctedPageCount));
  }, []);

  const editor = useEditor({
    extensions: getTextEditorExtensions(),
    content: parseTextContent(content),
    onCreate: ({ editor }) => {
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    },
    onUpdate: ({ editor }) => {
      const nextContent = JSON.stringify(editor.getJSON());
      lastEditorContentRef.current = nextContent;
      isInternalUpdateRef.current = true;
      onChange(nextContent);
      queueMicrotask(() => {
        isInternalUpdateRef.current = false;
      });
      if (pagedContainerRef.current) {
        schedulePagination(pagedContainerRef.current);
      }
    },
  }, [onChange, schedulePagination]);

  React.useEffect(() => {
    if (!editor || !pagedContainerRef.current) return;
    schedulePagination(pagedContainerRef.current);
  }, [editor, schedulePagination]);

  const updateImageToolsPosition = React.useCallback(() => {
    if (!editor || !scrollAreaRef.current || !editor.isActive('image')) {
      setImageTools((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const selectedImage = document.querySelector('.ProseMirror-selectednode img, img.ProseMirror-selectednode') as HTMLElement | null;
    if (!selectedImage) {
      setImageTools((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const rect = selectedImage.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = Math.max(140, viewportWidth - margin * 2);
    const panelWidth = Math.min(312, availableWidth);
    const panelHeight = 42;

    const left = Math.max(
      margin,
      Math.min(rect.left + rect.width / 2 - panelWidth / 2, viewportWidth - panelWidth - margin)
    );
    const preferredTop = rect.top - panelHeight - margin;
    const top = preferredTop > margin ? preferredTop : Math.min(rect.bottom + margin, viewportHeight - panelHeight - margin);

    setImageTools({ top, left, visible: true });
  }, [editor]);

  React.useEffect(() => {
    if (!editor) return;

    const onSelectionOrTransaction = () => updateImageToolsPosition();
    editor.on('selectionUpdate', onSelectionOrTransaction);
    editor.on('transaction', onSelectionOrTransaction);

    const onWindowResize = () => updateImageToolsPosition();
    const onScroll = () => updateImageToolsPosition();
    window.addEventListener('resize', onWindowResize);
    scrollAreaRef.current?.addEventListener('scroll', onScroll, { passive: true });

    updateImageToolsPosition();
    return () => {
      editor.off('selectionUpdate', onSelectionOrTransaction);
      editor.off('transaction', onSelectionOrTransaction);
      window.removeEventListener('resize', onWindowResize);
      scrollAreaRef.current?.removeEventListener('scroll', onScroll);
    };
  }, [editor, updateImageToolsPosition]);

  React.useEffect(() => {
    if (!editor) return;
    if (isInternalUpdateRef.current) return;
    if (content === lastEditorContentRef.current) return;

    lastEditorContentRef.current = content;
    editor.commands.setContent(parseTextContent(content), false);
    if (pagedContainerRef.current) {
      schedulePagination(pagedContainerRef.current);
    }
  }, [editor, content, schedulePagination]);

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

  const imageAttrs = editor.getAttributes('image') as { width?: number; align?: string; offsetX?: number };
  const currentImageWidth = Number(imageAttrs.width) > 0 ? Number(imageAttrs.width) : 420;
  const currentOffsetX = Number.isFinite(Number(imageAttrs.offsetX)) ? Number(imageAttrs.offsetX) : 0;
  const setImageWidth = (nextWidth: number) => {
    const width = Math.max(120, Math.min(680, nextWidth));
    editor.chain().focus().updateAttributes('image', { width }).run();
  };
  const nudgeImage = (deltaX: number) => {
    const nextOffset = Math.max(-220, Math.min(220, currentOffsetX + deltaX));
    editor.chain().focus().updateAttributes('image', { offsetX: nextOffset }).run();
  };

  const documentHeight = pageCount * PAGE_HEIGHT + (pageCount - 1) * PAGE_GAP;
  const pageMarkers = Array.from({ length: pageCount }, (_, i) => ({
    page: i + 1,
    top: i * (PAGE_HEIGHT + PAGE_GAP) + PAGE_HEIGHT - 22,
  }));

  return (
    <div className={styles.editorContainer}>
      <TextEditorToolbar editor={editor} fileInputRef={fileInputRef} />

      <div ref={scrollAreaRef} className={styles.scrollArea}>
        <div
          id="print-content"
          ref={pagedContainerRef}
          data-paged-document="true"
          className={styles.pagedDocument}
          style={
            {
              '--page-gap': `${PAGE_GAP}px`,
              height: `${documentHeight}px`,
            } as React.CSSProperties
          }
        >
          <EditorContent
            editor={editor}
            className={styles.editorCore}
            style={{ minHeight: `${documentHeight}px` }}
          />
          <div className={styles.pageMarkers} data-page-markers="true" aria-hidden="true">
            {pageMarkers.map((marker) => (
              <div
                key={marker.page}
                className={styles.pageMarker}
                data-page-marker="true"
                style={{ top: `${marker.top}px` }}
              >
                p.{marker.page}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.scrollEndSpacer} aria-hidden="true" />
      </div>

      {imageTools.visible && (
        <div
          className={styles.imageQuickTools}
          style={{ top: `${imageTools.top}px`, left: `${imageTools.left}px` }}
          role="toolbar"
          aria-label="Controles da imagem selecionada"
        >
          <button
            className={`btn-icon ${styles.imageToolButton}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setImageWidth(currentImageWidth - 40)}
            title="Diminuir imagem"
            aria-label="Diminuir imagem"
          >
            <Shrink size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setImageWidth(currentImageWidth + 40)}
            title="Aumentar imagem"
            aria-label="Aumentar imagem"
          >
            <Expand size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton} ${imageAttrs.align === 'left' ? 'active' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left', offsetX: 0 }).run()}
            title="Alinhar imagem à esquerda"
            aria-label="Alinhar imagem à esquerda"
          >
            <AlignLeft size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton} ${imageAttrs.align === 'center' ? 'active' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center', offsetX: 0 }).run()}
            title="Centralizar imagem"
            aria-label="Centralizar imagem"
          >
            <AlignCenter size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton} ${imageAttrs.align === 'right' ? 'active' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right', offsetX: 0 }).run()}
            title="Alinhar imagem à direita"
            aria-label="Alinhar imagem à direita"
          >
            <AlignRight size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => nudgeImage(-20)}
            title="Mover imagem um pouco para esquerda"
            aria-label="Mover imagem um pouco para esquerda"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className={`btn-icon ${styles.imageToolButton}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => nudgeImage(20)}
            title="Mover imagem um pouco para direita"
            aria-label="Mover imagem um pouco para direita"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
