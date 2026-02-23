import React from 'react';
import { Document } from '@/types';
import { FileText, Sheet, Trash2, Copy, Edit2, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { formatTimeAgoPt } from '@/utils/time';
import { buildDocumentPreview } from '@/lib/document-preview';
import styles from './document-card.module.css';

interface DocumentCardProps {
  doc: Document;
  viewMode: 'grid' | 'list';
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameSubmit: () => void;
  onRenameStart: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  style?: React.CSSProperties;
}

function DocumentCard({
  doc,
  viewMode,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameStart,
  onDelete,
  onDuplicate,
  style
}: DocumentCardProps) {
  const isText = doc.type === 'text';
  const timeAgo = React.useMemo(() => formatTimeAgoPt(doc.updatedAt), [doc.updatedAt]);
  const preview = React.useMemo(() => buildDocumentPreview(doc), [doc.type, doc.content]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onRenameSubmit();
    if (e.key === 'Escape') onRenameChange(doc.name);
  };

  return (
    <div
      className={`${styles.card} ${viewMode === 'grid' ? styles.cardGrid : styles.cardList}`}
      style={style}
    >
      <Link
        to="/editor/$id"
        params={{ id: doc.id }}
        className={styles.thumbnail}
        aria-label={`Abrir ${doc.name}`}
        title={`Abrir ${doc.name}`}
      >
        {viewMode === 'list' ? (
          isText ? <FileText size={20} /> : <Sheet size={20} />
        ) : isText ? (
          <div className={styles.textPreview} aria-hidden="true">
            {preview.kind === 'text' ? preview.blocks.map((block, index) => {
              if (block.kind === 'image') {
                return (
                  <img
                    key={`${doc.id}-img-${index}`}
                    className={styles.previewImage}
                    src={block.src}
                    alt=""
                    loading="lazy"
                  />
                );
              }

              if (block.kind === 'heading') {
                return <h4 key={`${doc.id}-h-${index}`}>{block.text}</h4>;
              }

              return <p key={`${doc.id}-p-${index}`}>{block.text}</p>;
            }) : null}
          </div>
        ) : (
          <div className={styles.sheetPreview} aria-hidden="true">
            {preview.kind === 'spreadsheet' ? (
              <table>
                <thead>
                  <tr>
                    {preview.headers.map((header) => (
                      <th key={`${doc.id}-h-${header}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr key={`${doc.id}-r-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${doc.id}-c-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )}
      </Link>

      <div className={styles.info}>
        {isRenaming ? (
          <input
            autoFocus
            className={styles.renameInput}
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={onRenameSubmit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <h3 className={styles.name} onClick={onRenameStart}>
            {doc.name}
          </h3>
        )}

        <div className={styles.meta}>
          <span className={`${styles.type} ${isText ? styles.typeText : styles.typeSheet}`}>
            {isText ? 'Texto' : 'Planilha'}
          </span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </div>

      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-icon"
          onClick={(e) => { e.preventDefault(); onDuplicate(); }}
          aria-label={`Duplicar ${doc.name}`}
          title="Duplicar"
        >
          <Copy size={14} />
        </button>
        <button
          className="btn-icon"
          onClick={(e) => { e.preventDefault(); onRenameStart(); }}
          aria-label={`Renomear ${doc.name}`}
          title="Renomear"
        >
          <Edit2 size={14} />
        </button>
        <button
          className="btn-icon btn-danger"
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          aria-label={`Excluir ${doc.name}`}
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
        <Link
          to="/editor/$id"
          params={{ id: doc.id }}
          className="btn-icon"
          aria-label={`Abrir ${doc.name}`}
          title="Abrir"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}

function arePropsEqual(prev: DocumentCardProps, next: DocumentCardProps): boolean {
  return (
    prev.doc.id === next.doc.id &&
    prev.doc.name === next.doc.name &&
    prev.doc.type === next.doc.type &&
    prev.doc.content === next.doc.content &&
    prev.doc.updatedAt === next.doc.updatedAt &&
    prev.viewMode === next.viewMode &&
    prev.isRenaming === next.isRenaming &&
    prev.renameValue === next.renameValue &&
    prev.style?.animationDelay === next.style?.animationDelay
  );
}

export default React.memo(DocumentCard, arePropsEqual);
