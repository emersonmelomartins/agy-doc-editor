import { create } from 'zustand';
import type { LayoutComponent, LayoutComponentKind } from '@/types';
import {
  listComponents as listComponentsStorage,
  getComponent as getComponentStorage,
  createComponent as createComponentStorage,
  updateComponent as updateComponentStorage,
  deleteComponent as deleteComponentStorage,
} from '@/lib/components-storage';

interface ComponentsState {
  components: LayoutComponent[];
  loadComponents: (kind?: LayoutComponentKind) => void;
  getComponent: (id: string) => LayoutComponent | null;
  createComponent: (name: string, kind: LayoutComponentKind, content: string) => LayoutComponent;
  updateComponent: (id: string, updates: { name?: string; content?: string }) => LayoutComponent | null;
  deleteComponent: (id: string) => boolean;
}

function refreshComponents(
  set: (payload: { components: LayoutComponent[] }) => void,
  kind?: LayoutComponentKind
): void {
  set({ components: listComponentsStorage(kind) });
}

export const useComponentsStore = create<ComponentsState>((set, get) => ({
  components: [],

  loadComponents: (kind) => {
    refreshComponents(set, kind);
  },

  getComponent: (id) => getComponentStorage(id),

  createComponent: (name, kind, content) => {
    const component = createComponentStorage(name, kind, content);
    set({ components: listComponentsStorage() });
    return component;
  },

  updateComponent: (id, updates) => {
    const updated = updateComponentStorage(id, updates);
    set({ components: listComponentsStorage() });
    return updated;
  },

  deleteComponent: (id) => {
    const ok = deleteComponentStorage(id);
    if (ok) set({ components: listComponentsStorage() });
    return ok;
  },
}));
