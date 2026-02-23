class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

export function setupBrowserMocks() {
  const localStorage = new LocalStorageMock();
  const attrs = new Map<string, string>();
  const cssVars = new Map<string, string>();

  const document = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attrs.set(name, value);
      },
      getAttribute: (name: string) => attrs.get(name) ?? null,
      style: {
        setProperty: (name: string, value: string) => {
          cssVars.set(name, value);
        },
        getPropertyValue: (name: string) => cssVars.get(name) ?? '',
      },
    },
  } as unknown as Document;

  (globalThis as any).window = {};
  (globalThis as any).document = document;
  (globalThis as any).localStorage = localStorage;

  return {
    localStorage,
    document,
    cssVars,
    cleanup: () => {
      delete (globalThis as any).window;
      delete (globalThis as any).document;
      delete (globalThis as any).localStorage;
    },
  };
}
