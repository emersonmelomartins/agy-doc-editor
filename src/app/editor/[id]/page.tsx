'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Document, DocumentType, SpreadsheetData } from '@/types';
import { getDocument, updateDocumentContent, renameDocument } from '@/lib/storage';
import { exportToDocx } from '@/lib/exportDocx';
import { exportToXlsx } from '@/lib/exportXlsx';
import { exportToPdf } from '@/lib/exportPdf';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  FileText, 
  Sheet, 
  Check, 
  ChevronDown,
  FileJson,
  Printer
} from 'lucide-react';
import styles from '../editor.module.css';

// Placeholder components
import TextEditor from '@/components/TextEditor';
import SpreadsheetEditor from '@/components/SpreadsheetEditor';

export default function EditorPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const d = getDocument(id);
    if (d) {
      setDoc(d);
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [id, router]);

  const handleContentChange = useCallback((newContent: string) => {
    setDoc(prev => prev ? { ...prev, content: newContent } : null);
    
    // Autosave
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      updateDocumentContent(id, newContent);
      setSaving(false);
    }, 1000);
  }, [id]);

  const handleRename = (newName: string) => {
    if (!doc) return;
    setDoc({ ...doc, name: newName });
    renameDocument(id, newName);
  };

  const handleExport = async (format: 'docx' | 'xlsx' | 'pdf' | 'json') => {
    if (!doc) return;
    setShowExportMenu(false);

    try {
      if (format === 'docx' && doc.type === 'text') {
        await exportToDocx(doc.content, doc.name);
      } else if (format === 'xlsx' && doc.type === 'spreadsheet') {
        const sheetData = JSON.parse(doc.content) as SpreadsheetData;
        await exportToXlsx(sheetData.data, doc.name);
      } else if (format === 'pdf') {
        await exportToPdf('editor-content', doc.name);
      } else if (format === 'json') {
        const blob = new Blob([doc.content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `${doc.name}.json`;
        a.click();
      }
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
          <button className="btn-icon" onClick={() => router.push('/')} title="Voltar ao Dashboard">
            <ArrowLeft size={18} />
          </button>
          
          <div className={styles.docInfo}>
            <input 
              className={styles.docName}
              value={doc.name}
              onChange={(e) => handleRename(e.target.value)}
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
          
          <button className="btn btn-primary" onClick={() => router.push('/')}>
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
