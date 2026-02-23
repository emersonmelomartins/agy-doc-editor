type PaginationConfig = {
  pageHeight?: number;
  overflowTolerance?: number;
};

const DEFAULT_PAGE_HEIGHT = 1123;

export function getPageContentHeight(config: PaginationConfig = {}): number {
  const pageHeight = config.pageHeight ?? DEFAULT_PAGE_HEIGHT;
  // Reserved only for legacy tests/usages that still expect A4 text area with 85px top/bottom.
  return Math.max(1, pageHeight - 170);
}

export function calculatePageCount(contentHeight: number, config: PaginationConfig = {}): number {
  const safeContentHeight = Math.max(0, contentHeight);
  const pageHeight = Math.max(1, config.pageHeight ?? DEFAULT_PAGE_HEIGHT);
  const overflowTolerance = Math.max(0, config.overflowTolerance ?? 8);
  const adjustedHeight = Math.max(0, safeContentHeight - overflowTolerance);
  return Math.max(1, Math.ceil(adjustedHeight / pageHeight));
}
