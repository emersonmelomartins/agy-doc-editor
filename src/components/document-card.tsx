import React from 'react';
import { Document } from '@/types';
import { FileText, Sheet, Trash2, Copy, Edit2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from '@tanstack/react-router';
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

export default function DocumentCard({
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
        {isText ? <FileText size={viewMode === 'grid' ? 40 : 20} /> : <Sheet size={viewMode === 'grid' ? 40 : 20} />}
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
          <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: ptBR })}</span>
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
