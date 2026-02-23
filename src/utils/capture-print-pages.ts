const A4_PAGE_WIDTH_PX = 794;
const A4_PAGE_HEIGHT_PX = 1123;

type Html2CanvasFn = (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;

function waitForRaf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  if (!images.length) return;

  await Promise.all(images.map(async (img) => {
    if (img.complete && img.naturalWidth > 0) return;
    try {
      await img.decode();
    } catch {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 1200);
      });
    }
  }));
}

function splitCanvasByPageHeight(canvas: HTMLCanvasElement, pageHeightPxOnCanvas: number): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  if (pageHeightPxOnCanvas <= 0) return [canvas];

  for (let pageIndex = 0; ; pageIndex++) {
    const sourceY = pageIndex * pageHeightPxOnCanvas;
    if (sourceY >= canvas.height - 2) break;

    const sourceHeight = Math.min(pageHeightPxOnCanvas, canvas.height - sourceY);
    if (sourceHeight <= 2) break;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    pages.push(pageCanvas);
  }

  return pages.length ? pages : [canvas];
}

function isCanvasLikelyBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const stepX = Math.max(1, Math.floor(canvas.width / 40));
  const stepY = Math.max(1, Math.floor(canvas.height / 40));
  let sampled = 0;
  let nonWhite = 0;

  for (let y = 0; y < canvas.height; y += stepY) {
    for (let x = 0; x < canvas.width; x += stepX) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const r = pixel[0] ?? 255;
      const g = pixel[1] ?? 255;
      const b = pixel[2] ?? 255;
      const a = pixel[3] ?? 255;
      sampled += 1;
      const isNearWhite = r > 247 && g > 247 && b > 247 && a > 245;
      if (!isNearWhite) nonWhite += 1;
    }
  }

  if (sampled === 0) return false;
  return nonWhite / sampled < 0.004;
}

async function renderWithFallback(html2canvas: Html2CanvasFn, element: HTMLElement): Promise<HTMLCanvasElement> {
  const primary = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering: true,
    imageTimeout: 0,
    removeContainer: true,
  });

  if (!isCanvasLikelyBlank(primary)) return primary;

  const fallback = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering: false,
    imageTimeout: 0,
    removeContainer: true,
    scrollX: 0,
    scrollY: 0,
  });

  return fallback;
}

export async function capturePrintPages(element: HTMLElement, html2canvas: Html2CanvasFn): Promise<HTMLCanvasElement[]> {
  const isPagedDocument = element.dataset.pagedDocument === 'true';
  const originalBackground = element.style.background;
  const originalBoxShadow = element.style.boxShadow;
  const originalPageGap = element.style.getPropertyValue('--page-gap');
  const originalHeight = element.style.height;
  const pageMarkersElement = element.querySelector('[data-page-markers="true"]') as HTMLElement | null;
  const originalMarkersDisplay = pageMarkersElement?.style.display ?? '';
  const editorCore = element.querySelector('[class*="editorCore"]') as HTMLElement | null;
  const originalEditorCoreMinHeight = editorCore?.style.minHeight ?? '';
  let expectedPageCount = 1;

  try {
    element.style.background = '#ffffff';
    element.style.boxShadow = 'none';

    if (isPagedDocument) {
      element.style.setProperty('--page-gap', '0px');
      if (pageMarkersElement) pageMarkersElement.style.display = 'none';
      expectedPageCount = Math.max(1, element.querySelectorAll('[data-page-marker="true"]').length);
      const exportHeight = expectedPageCount * A4_PAGE_HEIGHT_PX;
      element.style.height = `${exportHeight}px`;
      if (editorCore) editorCore.style.minHeight = `${exportHeight}px`;
    }

    await waitForImages(element);
    await waitForRaf();
    await waitForRaf();

    const fullCanvas = await renderWithFallback(html2canvas, element);

    if (!isPagedDocument) {
      const pageHeightPxOnCanvas = Math.round((fullCanvas.width * 297) / 210);
      return splitCanvasByPageHeight(fullCanvas, pageHeightPxOnCanvas);
    }

    const scaleRatio = fullCanvas.width / A4_PAGE_WIDTH_PX;
    const pageHeightPxOnCanvas = Math.max(1, Math.round(A4_PAGE_HEIGHT_PX * scaleRatio));
    const pages = splitCanvasByPageHeight(fullCanvas, pageHeightPxOnCanvas);
    return pages.slice(0, expectedPageCount);
  } finally {
    element.style.background = originalBackground;
    element.style.boxShadow = originalBoxShadow;
    element.style.height = originalHeight;

    if (isPagedDocument) {
      if (originalPageGap) {
        element.style.setProperty('--page-gap', originalPageGap);
      } else {
        element.style.removeProperty('--page-gap');
      }
      if (pageMarkersElement) pageMarkersElement.style.display = originalMarkersDisplay;
      if (editorCore) editorCore.style.minHeight = originalEditorCoreMinHeight;
    }
  }
}
