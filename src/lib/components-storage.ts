import type { LayoutComponent, LayoutComponentKind } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'doceditor_components';

export function listComponents(kind?: LayoutComponentKind): LayoutComponent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: LayoutComponent[] = raw ? JSON.parse(raw) : [];
    if (kind) return list.filter((c) => c.kind === kind);
    return list;
  } catch {
    return [];
  }
}

export function getComponent(id: string): LayoutComponent | null {
  const list = listComponents();
  return list.find((c) => c.id === id) ?? null;
}

export function createComponent(
  name: string,
  kind: LayoutComponentKind,
  content: string
): LayoutComponent {
  const now = new Date().toISOString();
  const component: LayoutComponent = {
    id: uuidv4(),
    name,
    kind,
    content,
    createdAt: now,
    updatedAt: now,
  };
  const list = listComponents();
  list.push(component);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return component;
}

export function updateComponent(
  id: string,
  updates: { name?: string; content?: string }
): LayoutComponent | null {
  const list = listComponents();
  const idx = list.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    ...updates,
    updatedAt: now,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list[idx];
}

export function deleteComponent(id: string): boolean {
  const list = listComponents().filter((c) => c.id !== id);
  if (list.length === listComponents().length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return true;
}
