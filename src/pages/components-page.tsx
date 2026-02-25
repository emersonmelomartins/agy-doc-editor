import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { LayoutComponent } from '@/types';
import { useComponentsStore } from '@/store/components-store';
import { ArrowLeft, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import styles from './editor-shell.module.css';
import componentsPageStyles from './components-page.module.css';
import ComponentFormModal from '@/components/component-form-modal';

export default function ComponentsPage() {
  const navigate = useNavigate();
  const components = useComponentsStore((s) => s.components);
  const loadComponents = useComponentsStore((s) => s.loadComponents);
  const deleteComponent = useComponentsStore((s) => s.deleteComponent);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<LayoutComponent | null>(null);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleNew = () => {
    setEditingComponent(null);
    setShowFormModal(true);
  };

  const handleEdit = (c: LayoutComponent) => {
    setEditingComponent(c);
    setShowFormModal(true);
  };

  const handleDelete = (c: LayoutComponent) => {
    if (confirm(`Excluir o componente "${c.name}"?`)) {
      deleteComponent(c.id);
    }
  };

  const handleFormClose = () => {
    setShowFormModal(false);
    setEditingComponent(null);
    loadComponents();
  };

  return (
    <div className={styles.editorPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate({ to: '/' })}
            aria-label="Voltar"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={styles.docInfo}>
            <h1 className={componentsPageStyles.pageTitle}>Componentes</h1>
            <div className={styles.status}>
              <FileText size={12} />
              <span>Blocos reutilizáveis para inserir no documento</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNew}
            aria-label="Novo componente"
          >
            <Plus size={16} />
            Novo componente
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate({ to: '/' })}
          >
            Voltar ao início
          </button>
        </div>
      </header>

      <main className={componentsPageStyles.main}>
        {components.length === 0 ? (
          <div className={componentsPageStyles.empty}>
            <p>Nenhum componente criado ainda.</p>
            <p>Crie blocos de conteúdo para inserir em qualquer lugar do documento.</p>
            <button type="button" className="btn btn-primary" onClick={handleNew}>
              <Plus size={16} />
              Criar primeiro componente
            </button>
          </div>
        ) : (
          <ul className={componentsPageStyles.list}>
            {components.map((c) => (
              <li key={c.id} className={componentsPageStyles.listItem}>
                <div className={componentsPageStyles.itemMain}>
                  <span className={componentsPageStyles.itemName}>{c.name}</span>
                  <span className={componentsPageStyles.itemDate}>
                    {new Date(c.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className={componentsPageStyles.itemActions}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleEdit(c)}
                    title="Editar"
                    aria-label={`Editar ${c.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleDelete(c)}
                    title="Excluir"
                    aria-label={`Excluir ${c.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showFormModal && (
        <ComponentFormModal
          component={editingComponent}
          onClose={handleFormClose}
          onSaved={handleFormClose}
        />
      )}
    </div>
  );
}
