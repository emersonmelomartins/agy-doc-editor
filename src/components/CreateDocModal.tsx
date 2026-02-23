'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentType } from '@/types';
import { createDocument } from '@/lib/storage';
import { TEMPLATES, EMPTY_TEMPLATES } from '@/lib/templates';
import { FileText, Sheet, X } from 'lucide-react';
import styles from './CreateDocModal.module.css';

interface CreateDocModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDocModal({ onClose, onCreated }: CreateDocModalProps) {
  const router = useRouter();
  const [type, setType] = useState<DocumentType>('text');
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = TEMPLATES.filter((t) => t.type === type);

  const handleCreate = () => {
    const finalName = name.trim() || (type === 'text' ? 'Novo Documento' : 'Nova Planilha');
    
    let content = '';
    if (selectedTemplate) {
      const tpl = TEMPLATES.find((t) => t.id === selectedTemplate);
      if (tpl) content = tpl.content;
    } else {
      content = type === 'text' ? EMPTY_TEMPLATES.text : EMPTY_TEMPLATES.spreadsheet;
    }

    const doc = createDocument(finalName, type, content, selectedTemplate || undefined);
    onCreated();
    router.push(`/editor/${doc.id}`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Criar Novo</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className={styles.typeSelector}>
            <div 
              className={`${styles.typeOption} ${type === 'text' ? styles.typeOptionActive : ''}`}
              onClick={() => { setType('text'); setSelectedTemplate(null); }}
            >
              <div className={styles.typeIcon}><FileText size={24} /></div>
              <span className={styles.typeLabel}>Documento</span>
            </div>
            <div 
              className={`${styles.typeOption} ${type === 'spreadsheet' ? styles.typeOptionActive : ''}`}
              onClick={() => { setType('spreadsheet'); setSelectedTemplate(null); }}
            >
              <div className={styles.typeIcon}><Sheet size={24} /></div>
              <span className={styles.typeLabel}>Planilha</span>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Nome do Arquivo</label>
            <input 
              className="input" 
              placeholder={type === 'text' ? 'Ex: Relatório de Vendas' : 'Ex: Orçamento 2024'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Ou comece com um template</label>
            <div className={styles.templateGrid}>
              <div 
                className={`${styles.templateItem} ${!selectedTemplate ? styles.templateItemActive : ''}`}
                onClick={() => setSelectedTemplate(null)}
              >
                <div className={styles.templateThumb}>✨</div>
                <div className={styles.templateInfo}>
                  <span className={styles.templateName}>Documento em Branco</span>
                  <span className={styles.templateDesc}>Começar do zero</span>
                </div>
              </div>

              {filteredTemplates.map((t) => (
                <div 
                  key={t.id} 
                  className={`${styles.templateItem} ${selectedTemplate === t.id ? styles.templateItemActive : ''}`}
                  onClick={() => setSelectedTemplate(t.id)}
                >
                  <div className={styles.templateThumb}>{t.thumbnail}</div>
                  <div className={styles.templateInfo}>
                    <span className={styles.templateName}>{t.name}</span>
                    <span className={styles.templateDesc}>{t.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate}>Criar e Abrir</button>
        </div>
      </div>
    </div>
  );
}
