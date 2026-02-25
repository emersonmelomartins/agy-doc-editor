import React, { useState, useEffect } from 'react';
import type { DocumentLayout, LayoutComponentKind } from '@/types';
import { DEFAULT_LAYOUT_SNIPPETS } from '@/lib/layout-snippets';
import { useComponentsStore } from '@/store/components-store';
import { X } from 'lucide-react';
import styles from './document-layout-modal.module.css';

const COVER_KIND: LayoutComponentKind = 'cover';
const HEADER_KIND: LayoutComponentKind = 'header';
const FOOTER_KIND: LayoutComponentKind = 'footer';

type SlotValue = 'none' | 'default' | string; // string = componentId

interface DocumentLayoutModalProps {
  currentLayout: DocumentLayout | null | undefined;
  onSave: (layout: DocumentLayout | null) => void;
  onClose: () => void;
}

export default function DocumentLayoutModal({
  currentLayout,
  onSave,
  onClose,
}: DocumentLayoutModalProps) {
  const components = useComponentsStore((s) => s.components);
  const loadComponents = useComponentsStore((s) => s.loadComponents);

  const [coverValue, setCoverValue] = useState<SlotValue>('none');
  const [headerValue, setHeaderValue] = useState<SlotValue>('none');
  const [footerValue, setFooterValue] = useState<SlotValue>('none');

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  useEffect(() => {
    if (currentLayout) {
      setCoverValue(
        currentLayout.coverComponentId
          ? currentLayout.coverComponentId
          : currentLayout.cover
            ? 'default'
            : 'none'
      );
      setHeaderValue(
        currentLayout.headerComponentId
          ? currentLayout.headerComponentId
          : currentLayout.header
            ? 'default'
            : 'none'
      );
      setFooterValue(
        currentLayout.footerComponentId
          ? currentLayout.footerComponentId
          : currentLayout.footer
            ? 'default'
            : 'none'
      );
    } else {
      setCoverValue('none');
      setHeaderValue('none');
      setFooterValue('none');
    }
  }, [currentLayout]);

  const coverComponents = components.filter((c) => c.kind === COVER_KIND);
  const headerComponents = components.filter((c) => c.kind === HEADER_KIND);
  const footerComponents = components.filter((c) => c.kind === FOOTER_KIND);

  const handleSave = () => {
    const hasAny =
      coverValue !== 'none' || headerValue !== 'none' || footerValue !== 'none';
    if (!hasAny) {
      onSave(null);
      onClose();
      return;
    }

    const layout: DocumentLayout = {};

    if (coverValue === 'default') {
      layout.cover = DEFAULT_LAYOUT_SNIPPETS.cover;
    } else if (coverValue !== 'none') {
      layout.coverComponentId = coverValue;
    }

    if (headerValue === 'default') {
      layout.header = DEFAULT_LAYOUT_SNIPPETS.header;
    } else if (headerValue !== 'none') {
      layout.headerComponentId = headerValue;
    }

    if (footerValue === 'default') {
      layout.footer = DEFAULT_LAYOUT_SNIPPETS.footer;
    } else if (footerValue !== 'none') {
      layout.footerComponentId = footerValue;
    }

    onSave(layout);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Layout do documento</h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className={styles.hint}>
            Ao aplicar, o conteúdo será inserido no documento (capa no início, cabeçalho e rodapé antes e depois do texto) para você poder editar. Componentes em Configurações → Componentes.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>Capa (primeira página)</label>
            <select
              className="input"
              value={coverValue}
              onChange={(e) => setCoverValue(e.target.value as SlotValue)}
            >
              <option value="none">Nenhum</option>
              <option value="default">Capa padrão</option>
              {coverComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Cabeçalho (em todas as páginas)</label>
            <select
              className="input"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value as SlotValue)}
            >
              <option value="none">Nenhum</option>
              <option value="default">Cabeçalho padrão</option>
              {headerComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Rodapé (em todas as páginas)</label>
            <select
              className="input"
              value={footerValue}
              onChange={(e) => setFooterValue(e.target.value as SlotValue)}
            >
              <option value="none">Nenhum</option>
              <option value="default">Rodapé padrão</option>
              {footerComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
