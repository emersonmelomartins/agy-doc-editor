import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import type { StoredDocument } from '@docsi/shared-types';
import { createDocumentEntity, type CreateDocumentInput } from '@/domain/entities/document';
import type { DocumentRepository } from '@/domain/ports/document-repository';

export class SqliteDocumentRepository implements DocumentRepository {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        layout TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  list(): StoredDocument[] {
    const rows = this.db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all() as Array<Record<string, unknown>>;
    return rows.map((row) => this.mapRow(row));
  }

  findById(id: string): StoredDocument | null {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRow(row) : null;
  }

  create(input: CreateDocumentInput): StoredDocument {
    const now = new Date().toISOString();
    const entity = createDocumentEntity(uuidv4(), input, now);
    this.db
      .prepare(
        'INSERT INTO documents (id, name, type, content, layout, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        entity.id,
        entity.name,
        entity.type,
        entity.content,
        entity.layout ? JSON.stringify(entity.layout) : null,
        entity.createdAt,
        entity.updatedAt
      );
    return entity;
  }

  update(
    id: string,
    patch: Partial<Pick<StoredDocument, 'name' | 'content' | 'layout'>>
  ): StoredDocument | null {
    const current = this.findById(id);
    if (!current) return null;

    const next: StoredDocument = {
      ...current,
      name: patch.name ?? current.name,
      content: patch.content ?? current.content,
      layout: patch.layout ?? current.layout,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare('UPDATE documents SET name = ?, content = ?, layout = ?, updated_at = ? WHERE id = ?')
      .run(next.name, next.content, next.layout ? JSON.stringify(next.layout) : null, next.updatedAt, id);

    return next;
  }

  remove(id: string): boolean {
    const result = this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  private mapRow(row: Record<string, unknown>): StoredDocument {
    return {
      id: String(row.id),
      name: String(row.name),
      type: row.type === 'spreadsheet' ? 'spreadsheet' : 'text',
      content: String(row.content),
      layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}

export function createSqliteDatabase(databasePath: string): DatabaseSync {
  return new DatabaseSync(databasePath);
}
