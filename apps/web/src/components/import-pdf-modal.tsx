import React from 'react';
import { FileImage, FileText, Loader2, X } from 'lucide-react';
import type { ApiCapabilities } from '@/lib/api-client';
import { getImportPdfOptionsState } from './import-pdf-modal-state';
import styles from './import-pdf-modal.module.css';

export type PdfImportMode = 'fidelity' | 'editable';

interface ImportPdfModalProps {
  file: File;
  onChoose: (mode: PdfImportMode) => void;
  onCancel: () => void;
  isImporting?: boolean;
  apiStatus?: 'checking' | 'online' | 'offline';
  capabilities?: ApiCapabilities | null;
}

export default function ImportPdfModal({
  file,
  onChoose,
  onCancel,
  isImporting = false,
  apiStatus = 'checking',
  capabilities = null,
}: ImportPdfModalProps) {
  const uiState = getImportPdfOptionsState({
    isImporting,
    apiStatus,
    capabilities,
  });
  const isBackendOffline = uiState.isBackendOffline;
  const editableAvailable = uiState.editableAvailable;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Como importar o PDF?</h2>
          <button
            type="button"
            className="btn-icon"
            onClick={onCancel}
            disabled={isImporting}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className={styles.hint}>
            <strong>{file.name}</strong>
          </p>
          {apiStatus === 'checking' && (
            <p className={styles.hint}>Verificando disponibilidade da API…</p>
          )}
          {isBackendOffline && (
            <p className={styles.hint} role="alert">
              Backend offline. A importacao de PDF depende da API.
            </p>
          )}
          {apiStatus === 'online' && !editableAvailable && (
            <p className={styles.hint} role="alert">
              Conversao PDF→DOCX indisponivel no servidor.
            </p>
          )}
          {isImporting && (
            <div className={styles.importing} role="status" aria-live="polite">
              <Loader2 size={32} className={styles.spinner} aria-hidden />
              <span>Importando PDF…</span>
            </div>
          )}
          <div className={styles.options}>
            <button
              type="button"
              className={styles.option}
              onClick={() => onChoose('fidelity')}
              disabled={uiState.disableFidelity}
              title="Cada página vira uma imagem; ideal para PDFs pesados ou quando precisa de cópia fiel."
            >
              <div className={styles.optionIcon}>
                <FileImage size={24} />
              </div>
              <span className={styles.optionTitle}>Fidelidade</span>
              <span className={styles.optionDesc}>Cada página vira uma imagem (recomendado para PDFs pesados)</span>
            </button>
            <button
              type="button"
              className={styles.option}
              onClick={() => onChoose('editable')}
              disabled={uiState.disableEditable}
              title="Converte PDF para DOCX via backend e importa para edição."
            >
              <div className={styles.optionIcon}>
                <FileText size={24} />
              </div>
              <span className={styles.optionTitle}>Editável</span>
              <span className={styles.optionDesc}>Conversão DOCX via API (com reforço textual)</span>
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isImporting}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
