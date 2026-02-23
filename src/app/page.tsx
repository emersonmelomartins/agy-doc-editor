'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document } from '@/types';
import { getDocuments, deleteDocument, duplicateDocument, renameDocument } from '@/lib/storage';
import { TEMPLATES } from '@/lib/templates';
import CreateDocModal from '@/components/CreateDocModal';
import DocumentCard from '@/components/DocumentCard';
import { FileText, Sheet, Plus, Search, LayoutGrid, List, Sparkles } from 'lucide-react';
import styles from './page.module.css';

type FilterType = 'all' | 'text' | 'spreadsheet';
type ViewMode = 'grid' | 'list';

export default function HomePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadDocs = useCallback(() => setDocuments(getDocuments()), []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const filtered = documents
    .filter((d) => filter === 'all' || d.type === filter)
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleDelete = (id: string) => {
    if (confirm('Excluir este documento?')) { deleteDocument(id); loadDocs(); }
  };

  const handleDuplicate = (id: string) => { duplicateDocument(id); loadDocs(); };

  const startRename = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameValue(doc.name);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) { renameDocument(id, renameValue.trim()); loadDocs(); }
    setRenamingId(null);
  };

  const textCount = documents.filter((d) => d.type === 'text').length;
  const sheetCount = documents.filter((d) => d.type === 'spreadsheet').length;

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <FileText size={20} />
          </div>
          <span className={styles.logoText}>DocEditor</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Filtrar</div>
          <button className={`${styles.navItem} ${filter === 'all' ? styles.navItemActive : ''}`} onClick={() => setFilter('all')}>
            <LayoutGrid size={16} /> Todos <span className={styles.navCount}>{documents.length}</span>
          </button>
          <button className={`${styles.navItem} ${filter === 'text' ? styles.navItemActive : ''}`} onClick={() => setFilter('text')}>
            <FileText size={16} /> Documentos <span className={styles.navCount}>{textCount}</span>
          </button>
          <button className={`${styles.navItem} ${filter === 'spreadsheet' ? styles.navItemActive : ''}`} onClick={() => setFilter('spreadsheet')}>
            <Sheet size={16} /> Planilhas <span className={styles.navCount}>{sheetCount}</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarStat}>
            <span>{documents.length} documentos</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>
              {filter === 'all' ? 'Todos os Documentos' : filter === 'text' ? 'Documentos de Texto' : 'Planilhas'}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.searchWrapper}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Pesquisar documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.viewToggle}>
              <button className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grade">
                <LayoutGrid size={16} />
              </button>
              <button className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Lista">
                <List size={16} />
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Novo Documento
            </button>
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {documents.length === 0 && !search ? (
            /* Empty state */
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Sparkles size={40} />
              </div>
              <h2>Nenhum documento ainda</h2>
              <p>Crie seu primeiro documento ou use um de nossos templates prontos</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreateModal(true)}>
                <Plus size={16} /> Criar Documento
              </button>

              {/* Template quick picks */}
              <div className={styles.templatePicks}>
                <div className={styles.templatePicksLabel}>Templates rápidos</div>
                <div className={styles.templatePicksGrid}>
                  {TEMPLATES.map((t) => (
                    <button key={t.id} className={styles.templatePick} onClick={() => setShowCreateModal(true)}>
                      <span>{t.thumbnail}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Search size={32} /></div>
              <h2>Nenhum resultado</h2>
              <p>Tente pesquisar com outros termos</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? styles.grid : styles.listView}>
              {filtered.map((doc, i) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  viewMode={viewMode}
                  isRenaming={renamingId === doc.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameSubmit={() => commitRename(doc.id)}
                  onRenameStart={() => startRename(doc)}
                  onDelete={() => handleDelete(doc.id)}
                  onDuplicate={() => handleDuplicate(doc.id)}
                  style={{ animationDelay: `${i * 30}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateDocModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { loadDocs(); setShowCreateModal(false); }}
        />
      )}
    </div>
  );
}
