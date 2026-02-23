import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Document } from '@/types';
import { useDocumentsStore } from '@/store/documents-store';
import { ExportFormat, exportDocument } from '@/services/export-service';
import {
  ArrowLeft,
  Download,
  FileText,
  Sheet,
  Check,
  ChevronDown,
  FileJson,
  Printer
} from 'lucide-react';
import styles from '@/styles/editor.module.css';

import TextEditor from '@/components/text-editor';
import SpreadsheetEditor from '@/components/spreadsheet-editor';

export default function EditorPage() {
  const { id } = useParams({ from: '/editor/$id' });
  const navigate = useNavigate();

  const documents = useDocumentsStore((s) => s.documents);
  const loadDocuments = useDocumentsStore((s) => s.loadDocuments);
  const findDocumentById = useDocumentsStore((s) => s.findDocumentById);
  const updateDocumentContentById = useDocumentsStore((s) => s.updateDocumentContentById);
  const renameDocumentById = useDocumentsStore((s) => s.renameDocumentById);

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    const fromStore = documents.find((d) => d.id === id);
    const fromStorage = fromStore ?? findDocumentById(id);

    if (fromStorage) {
      setDoc(fromStorage);
    } else if (!loading) {
      navigate({ to: '/' });
    }

    setLoading(false);
  }, [documents, findDocumentById, id, loading, navigate]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setDoc((prev) => prev ? { ...prev, content: newContent } : null);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      updateDocumentContentById(id, newContent);
      setSaving(false);
    }, 800);
  }, [id, updateDocumentContentById]);

  const handleRename = (newName: string) => {
    if (!doc) return;
    setDoc({ ...doc, name: newName });
    renameDocumentById(id, newName);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!doc) return;
    setShowExportMenu(false);

    try {
      await exportDocument(doc, format);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Falha na exportação. Verifique o console para detalhes.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Carregando documento...</span>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className={styles.editorPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className="btn-icon"
            onClick={() => navigate({ to: '/' })}
            aria-label="Voltar ao Dashboard"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className={styles.docInfo}>
            <input
              className={styles.docName}
              value={doc.name}
              onChange={(e) => handleRename(e.target.value)}
              aria-label="Nome do documento"
              title="Nome do documento"
            />
            <div className={styles.status}>
              {doc.type === 'text' ? <FileText size={12} /> : <Sheet size={12} />}
              <span>•</span>
              {saving ? 'Salvando...' : (
                <>
                  <Check size={12} className="text-green" />
                  <span>Salvo localmente</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.exportMenu}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-label="Abrir menu de exportação"
              title="Exportar documento"
            >
              <Download size={16} /> Exportar <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div className={styles.menuDropdown}>
                {doc.type === 'text' && (
                  <button className={styles.menuItem} onClick={() => handleExport('docx')}>
                    <FileText size={14} /> Word (.docx)
                  </button>
                )}
                {doc.type === 'spreadsheet' && (
                  <button className={styles.menuItem} onClick={() => handleExport('xlsx')}>
                    <Sheet size={14} /> Excel (.xlsx)
                  </button>
                )}
                <button className={styles.menuItem} onClick={() => handleExport('pdf')}>
                  <Printer size={14} /> PDF (.pdf)
                </button>
                <div className={styles.menuDivider} />
                <button className={styles.menuItem} onClick={() => handleExport('json')}>
                  <FileJson size={14} /> Dados Brutos (.json)
                </button>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate({ to: '/' })}
            aria-label="Sair do editor"
            title="Sair do editor"
          >
            Sair
          </button>
        </div>
      </header>

      <main className={styles.main} id="editor-content">
        {doc.type === 'text' ? (
          <TextEditor content={doc.content} onChange={handleContentChange} />
        ) : (
          <SpreadsheetEditor content={doc.content} onChange={handleContentChange} />
        )}
      </main>
    </div>
  );
}
