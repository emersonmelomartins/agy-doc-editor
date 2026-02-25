import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { LayoutComponent } from '@/types';
import { useComponentsStore } from '@/store/components-store';
import { parseTextContent } from '@/utils/text-content';
import { getTextEditorExtensions } from '@/lib/text-editor-extensions';
import TextEditorToolbar from '@/components/editor/text-editor-toolbar';
import { X } from 'lucide-react';
import formStyles from './component-form-modal.module.css';

const EMPTY_DOC = { type: 'doc' as const, content: [{ type: 'paragraph', content: [] }] };

interface ComponentFormModalProps {
  component: LayoutComponent | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ComponentFormModal({
  component,
  onClose,
  onSaved,
}: ComponentFormModalProps) {
  const createComponent = useComponentsStore((s) => s.createComponent);
  const updateComponent = useComponentsStore((s) => s.updateComponent);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(component?.name ?? '');

  const editor = useEditor({
    extensions: getTextEditorExtensions(),
    content: component?.content ? parseTextContent(component.content) : EMPTY_DOC,
    editorProps: { attributes: { 'data-placeholder': 'Conteúdo do componente...' } },
  });

  useEffect(() => {
    if (component) {
      setName(component.name);
      editor?.commands.setContent(parseTextContent(component.content));
    } else {
      setName('');
      editor?.commands.setContent(EMPTY_DOC);
    }
  }, [component?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !editor) return;

    const content = JSON.stringify(editor.getJSON());

    if (component) {
      updateComponent(component.id, { name: trimmedName, content });
    } else {
      createComponent(trimmedName, 'cover', content);
    }
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {component ? 'Editar componente' : 'Novo componente'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className={formStyles.field}>
              <label className={formStyles.label}>Nome</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bloco de assinaturas"
                required
              />
            </div>

            <div className={formStyles.field}>
              <label className={formStyles.label}>Conteúdo</label>
              <div className={formStyles.editorWrap}>
                {editor && (
                  <>
                    <TextEditorToolbar editor={editor} fileInputRef={fileInputRef} showComponentInsert={false} />
                    <div className={formStyles.editorArea}>
                      <EditorContent editor={editor} className={formStyles.editorInner} />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      aria-hidden
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {component ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
