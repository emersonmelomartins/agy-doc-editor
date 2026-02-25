import { useState, useEffect, useMemo, useDeferredValue, type ChangeEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Document } from '@/types';
import { importDocumentFile, importPdfFile, importPdfFileAsPageImages } from '@/lib/import-documents';
import { useDocumentsStore } from '@/store/documents-store';
import { DocumentsFilter, DocumentsViewMode, filterDocuments, getDocumentsStats } from '@/features/documents/model';
import CreateDocModal from '@/components/create-doc-modal';
import ImportPdfModal from '@/components/import-pdf-modal';
import DocumentCard from '@/components/document-card';
import BrandLogo from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { FileText, Sheet, Plus, Search, LayoutGrid, List, Sparkles, Upload, LayoutTemplate } from 'lucide-react';
import styles from '@/styles/home.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const documents = useDocumentsStore((s) => s.documents);
  const loadDocuments = useDocumentsStore((s) => s.loadDocuments);
  const createNewDocument = useDocumentsStore((s) => s.createNewDocument);
  const deleteDocumentById = useDocumentsStore((s) => s.deleteDocumentById);
  const duplicateDocumentById = useDocumentsStore((s) => s.duplicateDocumentById);
  const renameDocumentById = useDocumentsStore((s) => s.renameDocumentById);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DocumentsFilter>('all');
  const [viewMode, setViewMode] = useState<DocumentsViewMode>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitialType, setCreateModalInitialType] = useState<'text' | 'spreadsheet'>('text');
  const [isImporting, setIsImporting] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const deferredSearch = useDeferredValue(search);
  const filtered = useMemo(() => filterDocuments(documents, filter, deferredSearch), [documents, filter, deferredSearch]);
  const stats = useMemo(() => getDocumentsStats(documents), [documents]);

  const handleDelete = (id: string) => {
    if (confirm('Excluir este documento?')) {
      deleteDocumentById(id);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateDocumentById(id);
  };

  const startRename = (doc: Document) => {
    setRenamingId(doc.id);
    setRenameValue(doc.name);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) {
      renameDocumentById(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setPendingPdfFile(file);
      setShowPdfImportModal(true);
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importDocumentFile(file);
      createNewDocument(imported.name, 'text', imported.content, 'imported-file');
      loadDocuments();
    } catch (error) {
      console.error('Falha ao importar arquivo:', error);
      alert('Nao foi possivel importar o arquivo. Use .docx ou .pdf valido.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handlePdfImportMode = async (mode: 'fidelity' | 'editable') => {
    if (!pendingPdfFile) return;
    setIsImporting(true);
    try {
      const imported =
        mode === 'fidelity'
          ? await importPdfFileAsPageImages(pendingPdfFile)
          : await importPdfFile(pendingPdfFile);
      createNewDocument(imported.name, 'text', imported.content, 'imported-file');
      loadDocuments();
      setShowPdfImportModal(false);
      setPendingPdfFile(null);
    } catch (error) {
      console.error('Falha ao importar PDF:', error);
      alert(
        error instanceof Error ? error.message : 'Nao foi possivel importar o PDF. Verifique o arquivo.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handlePdfImportCancel = () => {
    setShowPdfImportModal(false);
    setPendingPdfFile(null);
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <BrandLogo showTagline />
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Filtrar</div>
          <button
            className={`${styles.navItem} ${filter === 'all' ? styles.navItemActive : ''}`}
            onClick={() => setFilter('all')}
            aria-label="Filtrar todos os documentos"
            title="Filtrar todos os documentos"
          >
            <LayoutGrid size={16} /> Todos <span className={styles.navCount}>{stats.total}</span>
          </button>
          <button
            className={`${styles.navItem} ${filter === 'text' ? styles.navItemActive : ''}`}
            onClick={() => setFilter('text')}
            aria-label="Filtrar documentos de texto"
            title="Filtrar documentos de texto"
          >
            <FileText size={16} /> Documentos <span className={styles.navCount}>{stats.text}</span>
          </button>
          <button
            className={`${styles.navItem} ${filter === 'spreadsheet' ? styles.navItemActive : ''}`}
            onClick={() => setFilter('spreadsheet')}
            aria-label="Filtrar planilhas"
            title="Filtrar planilhas"
          >
            <Sheet size={16} /> Planilhas <span className={styles.navCount}>{stats.spreadsheet}</span>
          </button>
        </nav>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>Configurações</div>
          <button
            type="button"
            className={styles.navItem}
            onClick={() => navigate({ to: '/componentes' })}
            aria-label="Componentes de layout"
            title="Capas, cabeçalhos e rodapés"
          >
            <LayoutTemplate size={16} /> Componentes
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarStat}>
            <span>{stats.total} documentos</span>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
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
                aria-label="Pesquisar documentos"
              />
            </div>
            <div className={styles.viewToggle}>
              <button
                className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Visualizar em grade"
                title="Visualizar em grade"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="Visualizar em lista"
                title="Visualizar em lista"
              >
                <List size={16} />
              </button>
            </div>
            <label
              className={`btn btn-ghost ${styles.importButton}`}
              style={{ cursor: 'pointer' }}
              role="button"
              aria-label={isImporting ? 'Importando arquivo' : 'Importar arquivo DOCX ou PDF'}
              aria-busy={isImporting}
              title={isImporting ? 'Importando arquivo' : 'Importar arquivo DOCX ou PDF'}
            >
              <Upload size={16} /> {isImporting ? 'Importando...' : 'Importar DOCX/PDF'}
              <input
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleImport}
                disabled={isImporting}
                style={{ display: 'none' }}
                aria-label="Selecionar arquivo para importação"
              />
            </label>
            <Button
              className={styles.createButton}
              onClick={() => {
                setCreateModalInitialType('text');
                setShowCreateModal(true);
              }}
            >
              <Plus size={16} /> Novo Documento
            </Button>
          </div>
        </header>

        <div className={styles.content}>
          {documents.length === 0 && !search ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Sparkles size={40} />
              </div>
              <h2>Nenhum documento ainda</h2>
              <p>Crie seu primeiro documento</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setCreateModalInitialType('text');
                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} /> Criar Documento
              </button>
            </div>
          ) : filtered.length === 0 && search ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Search size={32} /></div>
              <h2>Nenhum resultado</h2>
              <p>Tente pesquisar com outros termos</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                {filter === 'text' ? <FileText size={40} /> : <Sheet size={40} />}
              </div>
              <h2>
                {filter === 'text' ? 'Nenhum documento de texto' : 'Nenhuma planilha'}
              </h2>
              <p>
                {filter === 'text'
                  ? 'Crie seu primeiro documento de texto'
                  : 'Crie sua primeira planilha'}
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setCreateModalInitialType(filter === 'spreadsheet' ? 'spreadsheet' : 'text');
                  setShowCreateModal(true);
                }}
              >
                <Plus size={16} />
                {filter === 'text' ? 'Criar Documento' : 'Criar Planilha'}
              </button>
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
          initialType={createModalInitialType}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            loadDocuments();
            setShowCreateModal(false);
          }}
        />
      )}

      {showPdfImportModal && pendingPdfFile && (
        <ImportPdfModal
          file={pendingPdfFile}
          onChoose={handlePdfImportMode}
          onCancel={handlePdfImportCancel}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}
