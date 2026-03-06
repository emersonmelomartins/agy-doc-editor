const A4_PAGE_WIDTH_PX = 794;
const A4_PAGE_HEIGHT_PX = 1123;

type Html2CanvasFn = (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type PageCrop = { x: number; y: number; width: number; height: number };

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

async function imageToDataUrl(img: HTMLImageElement): Promise<string | null> {
  const src = (img.getAttribute('src') ?? img.src) || '';
  if (!src) return null;
  if (src.startsWith('data:')) return src;

  return new Promise((resolve) => {
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, el.naturalWidth || el.width);
        canvas.height = Math.max(1, el.naturalHeight || el.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(el, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    el.onerror = () => resolve(null);
    el.src = src;
  });
}

async function ensureImagesAsDataUrls(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(
    images.map(async (img) => {
      const dataUrl = await imageToDataUrl(img);
      if (dataUrl) img.src = dataUrl;
    })
  );
}

function isCanvasBlackOrTransparent(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;

  const stepX = Math.max(1, Math.floor(canvas.width / 48));
  const stepY = Math.max(1, Math.floor(canvas.height / 48));
  let sampled = 0;
  let nearBlack = 0;
  let transparent = 0;

  for (let y = 0; y < canvas.height; y += stepY) {
    for (let x = 0; x < canvas.width; x += stepX) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      const r = p[0] ?? 255, g = p[1] ?? 255, b = p[2] ?? 255, a = p[3] ?? 255;
      sampled += 1;
      if (a < 8) transparent += 1;
      else if (r < 8 && g < 8 && b < 8) nearBlack += 1;
    }
  }

  if (sampled === 0) return true;
  return transparent / sampled > 0.95 || nearBlack / sampled > 0.95;
}

function buildOnClone(printContentEl: HTMLElement) {
  return (clonedDocument: Document) => {
    clonedDocument.documentElement.style.background = '#ffffff';
    clonedDocument.body.style.background = '#ffffff';
    clonedDocument.documentElement.style.colorScheme = 'light';
    clonedDocument.body.style.colorScheme = 'light';

    const clonedPrintContent = clonedDocument.getElementById('print-content');
    if (clonedPrintContent) {
      clonedPrintContent.style.setProperty('background', '#ffffff', 'important');
      clonedPrintContent.style.setProperty('background-color', '#ffffff', 'important');
    }

    const editorCoreEl = clonedDocument.querySelector('[class*="editorCore"]') as HTMLElement | null;
    if (editorCoreEl) {
      editorCoreEl.style.setProperty('-webkit-mask-image', 'none', 'important');
      editorCoreEl.style.setProperty('mask-image', 'none', 'important');
      editorCoreEl.style.setProperty('background', 'transparent', 'important');
    }

    const root = clonedDocument.body.firstElementChild;
    if (root instanceof HTMLElement) {
      root.style.setProperty('background', '#ffffff', 'important');
    }

    void printContentEl;
  };
}

function buildRenderOptions(
  foreignObjectRendering: boolean,
  onClone: (doc: Document) => void,
  crop?: PageCrop,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    foreignObjectRendering,
    imageTimeout: 0,
    removeContainer: true,
    scrollX: 0,
    scrollY: 0,
    onclone: onClone,
  };

  if (!crop) return base;

  return {
    ...base,
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
  };
}

async function renderPage(
  html2canvas: Html2CanvasFn,
  element: HTMLElement,
  onClone: (doc: Document) => void,
  crop?: PageCrop,
): Promise<HTMLCanvasElement> {
  for (const foreignObjectRendering of [false, true, false]) {
    const canvas = await html2canvas(element, buildRenderOptions(foreignObjectRendering, onClone, crop));
    if (!isCanvasBlackOrTransparent(canvas)) return canvas;
  }

  const canvas = await html2canvas(element, buildRenderOptions(false, onClone, crop));
  if (isCanvasBlackOrTransparent(canvas)) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  return canvas;
}

export async function capturePrintPages(
  element: HTMLElement,
  html2canvas: Html2CanvasFn,
): Promise<HTMLCanvasElement[]> {
  const isPagedDocument = element.dataset.pagedDocument === 'true';
  const originalBackground = element.style.background;
  const originalBoxShadow = element.style.boxShadow;
  const originalPageGap = element.style.getPropertyValue('--page-gap');
  const originalHeight = element.style.height;
  const pageMarkersElement = element.querySelector('[data-page-markers="true"]') as HTMLElement | null;
  const originalMarkersDisplay = pageMarkersElement?.style.display ?? '';
  const editorCore = element.querySelector('[class*="editorCore"]') as HTMLElement | null;
  const originalEditorCoreMinHeight = editorCore?.style.minHeight ?? '';

  const onClone = buildOnClone(element);

  try {
    element.style.background = '#ffffff';
    element.style.boxShadow = 'none';

    if (!isPagedDocument) {
      await waitForImages(element);
      await ensureImagesAsDataUrls(element);
      await waitForRaf();
      const fullCanvas = await renderPage(html2canvas, element, onClone);
      const pageHeightPxOnCanvas = Math.round((fullCanvas.width * 297) / 210);
      return splitCanvasByPageHeight(fullCanvas, pageHeightPxOnCanvas);
    }

    element.style.setProperty('--page-gap', '0px');
    if (pageMarkersElement) pageMarkersElement.style.display = 'none';
    const expectedPageCount = Math.max(1, element.querySelectorAll('[data-page-marker="true"]').length);
    const exportHeight = expectedPageCount * A4_PAGE_HEIGHT_PX;
    element.style.height = `${exportHeight}px`;
    if (editorCore) editorCore.style.minHeight = `${exportHeight}px`;

    await waitForImages(element);
    await ensureImagesAsDataUrls(element);
    await waitForRaf();
    await waitForRaf();

    const pages: HTMLCanvasElement[] = [];
    for (let pageIndex = 0; pageIndex < expectedPageCount; pageIndex++) {
      const pageCanvas = await renderPage(html2canvas, element, onClone, {
        x: 0,
        y: pageIndex * A4_PAGE_HEIGHT_PX,
        width: A4_PAGE_WIDTH_PX,
        height: A4_PAGE_HEIGHT_PX,
      });
      pages.push(pageCanvas);
    }
    return pages;
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

function splitCanvasByPageHeight(canvas: HTMLCanvasElement, pageHeightPx: number): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  if (pageHeightPx <= 0) return [canvas];

  for (let i = 0; ; i++) {
    const sourceY = i * pageHeightPx;
    if (sourceY >= canvas.height - 2) break;
    const sourceHeight = Math.min(pageHeightPx, canvas.height - sourceY);
    if (sourceHeight <= 2) break;

    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = sourceHeight;
    const ctx = page.getContext('2d');
    if (!ctx) break;
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
    pages.push(page);
  }

  return pages.length ? pages : [canvas];
}
