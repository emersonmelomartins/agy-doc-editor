const A4_PAGE_WIDTH_PX = 794;
const A4_PAGE_HEIGHT_PX = 1123;

type Html2CanvasFn = (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;
type CaptureCrop = { x: number; y: number; width: number; height: number };

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

function splitCanvasByPageHeight(
  canvas: HTMLCanvasElement,
  pageHeightPxOnCanvas: number,
  boundaryCompensationPx: number = 0
): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  if (pageHeightPxOnCanvas <= 0) return [canvas];

  for (let pageIndex = 0; ; pageIndex++) {
    const nominalY = pageIndex * pageHeightPxOnCanvas;
    const sourceY = pageIndex === 0
      ? nominalY
      : Math.max(0, nominalY - boundaryCompensationPx);
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

function isCanvasRenderInvalid(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;

  const stepX = Math.max(1, Math.floor(canvas.width / 48));
  const stepY = Math.max(1, Math.floor(canvas.height / 48));
  let sampled = 0;
  let nearWhite = 0;
  let nearBlack = 0;
  let mostlyTransparent = 0;

  for (let y = 0; y < canvas.height; y += stepY) {
    for (let x = 0; x < canvas.width; x += stepX) {
      const p = ctx.getImageData(x, y, 1, 1).data;
      const r = p[0] ?? 255;
      const g = p[1] ?? 255;
      const b = p[2] ?? 255;
      const a = p[3] ?? 255;
      sampled += 1;

      if (a < 8) mostlyTransparent += 1;
      if (r > 247 && g > 247 && b > 247 && a > 245) nearWhite += 1;
      if (r < 8 && g < 8 && b < 8 && a > 245) nearBlack += 1;
    }
  }

  if (sampled === 0) return true;
  const whiteRatio = nearWhite / sampled;
  const blackRatio = nearBlack / sampled;
  const transparentRatio = mostlyTransparent / sampled;

  if (transparentRatio > 0.95) return true;
  if (blackRatio > 0.95) return true;
  if (whiteRatio > 0.995 || isCanvasLikelyBlank(canvas)) return true;
  return false;
}

function buildRenderOptions(foreignObjectRendering: boolean, crop?: CaptureCrop): Record<string, unknown> {
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
    onclone: (clonedDocument: Document) => {
      clonedDocument.documentElement.style.background = '#ffffff';
      clonedDocument.body.style.background = '#ffffff';
      clonedDocument.documentElement.style.colorScheme = 'light';
      clonedDocument.body.style.colorScheme = 'light';
    },
  };

  if (!crop) return base;
  return {
    ...base,
    x: crop.x,
    y: crop.y,
    width: crop.width,
    height: crop.height,
    windowWidth: crop.width,
    windowHeight: crop.height,
  };
}

async function renderWithFallback(
  html2canvas: Html2CanvasFn,
  element: HTMLElement,
  crop?: CaptureCrop
): Promise<HTMLCanvasElement> {
  const attempts = [true, false, true];

  let lastCanvas: HTMLCanvasElement | null = null;
  for (const foreignObjectRendering of attempts) {
    const canvas = await html2canvas(element, buildRenderOptions(foreignObjectRendering, crop));
    lastCanvas = canvas;
    if (!isCanvasRenderInvalid(canvas)) {
      return canvas;
    }
  }

  return lastCanvas ?? await html2canvas(element, buildRenderOptions(false, crop));
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

    if (!isPagedDocument) {
      const fullCanvas = await renderWithFallback(html2canvas, element);
      const pageHeightPxOnCanvas = Math.round((fullCanvas.width * 297) / 210);
      return splitCanvasByPageHeight(fullCanvas, pageHeightPxOnCanvas);
    }

    const pages: HTMLCanvasElement[] = [];
    for (let pageIndex = 0; pageIndex < expectedPageCount; pageIndex++) {
      const pageCanvas = await renderWithFallback(html2canvas, element, {
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
