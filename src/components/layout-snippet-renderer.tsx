import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { parseTextContent } from '@/utils/text-content';
import { getTextEditorExtensions } from '@/lib/text-editor-extensions';

import styles from './layout-snippet-renderer.module.css';

interface LayoutSnippetRendererProps {
  /** TipTap doc as JSON string */
  content: string;
  className?: string;
}

/** Renders a layout snippet (cover, header, footer) as read-only TipTap content. */
export default function LayoutSnippetRenderer({ content, className }: LayoutSnippetRendererProps) {
  const editor = useEditor({
    extensions: getTextEditorExtensions(),
    content: parseTextContent(content),
    editable: false,
    editorProps: { attributes: { 'data-readonly': 'true' } },
  });

  useEffect(() => {
    if (!editor) return;
    const parsed = parseTextContent(content);
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(parsed)) {
      editor.commands.setContent(parsed);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
