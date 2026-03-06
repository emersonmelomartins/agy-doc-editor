import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFixture = path.resolve(__dirname, '../../../tests/fixtures/pdf/executive-summary.pdf');
const fixturePdfPath = process.env.E2E_FIXTURE_PDF ?? defaultFixture;
const expectedName = path.basename(fixturePdfPath).replace(/\.pdf$/i, '');
const fallbackDocxFixture = path.resolve(__dirname, '../../../tests/fixtures/docx/executive-summary-template.docx');
const fixtureDocxPath = process.env.E2E_FIXTURE_DOCX ?? fallbackDocxFixture;

async function mockPdfApiOnline(page: import('@playwright/test').Page) {
  await page.route('**/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  await page.route('**/api/capabilities', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          pdfToDocxAvailable: true,
          ocrAvailable: true,
          pdfRasterizationAvailable: true,
        },
      }),
    });
  });

  await page.route('**/api/convert/pdf-to-docx', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      path: fixtureDocxPath,
    });
  });

  await page.route('**/api/import/pdf/editable', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          text: 'Texto de reforco do OCR',
          source: 'hybrid',
          qualityReport: {
            score: 0.92,
            pages: [{ page: 1, mode: 'hybrid', confidence: 0.92 }],
            warnings: [],
          },
        },
      }),
    });
  });
}

test('editable pdf import creates a document card', async ({ page }) => {
  await mockPdfApiOnline(page);
  await page.goto('/');

  const input = page.locator('input[type="file"][accept*=".pdf"]');
  await input.setInputFiles(fixturePdfPath);

  await page.getByRole('button', { name: /Editável/i }).click();
  await expect(page.getByText(expectedName).first()).toBeVisible();
});

test('editable import is blocked when backend is offline', async ({ page }) => {
  await page.route('**/health', async (route) => {
    await route.abort('failed');
  });

  await page.goto('/');
  const input = page.locator('input[type="file"][accept*=".pdf"]');
  await input.setInputFiles(fixturePdfPath);

  await expect(page.getByRole('button', { name: /Editável/i })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText(/Backend offline/i);
  await expect(page.getByRole('link', { name: new RegExp(`Abrir ${expectedName}`, 'i') })).toHaveCount(0);
});

test('exports imported document as docx and pdf with valid extensions', async ({ page }) => {
  await mockPdfApiOnline(page);
  await page.goto('/');
  const input = page.locator('input[type="file"][accept*=".pdf"]');
  await input.setInputFiles(fixturePdfPath);

  await page.getByRole('button', { name: /Editável/i }).click();
  const openLink = page.getByRole('link', { name: new RegExp(`Abrir ${expectedName}`, 'i') }).first();
  await openLink.click();
  await expect(page).toHaveURL(/\/editor\//);

  const exportButton = page.getByRole('button', { name: /Abrir menu de exportação/i });
  await exportButton.click();

  const downloadDocxPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Word \(\.docx\)/i }).click();
  const docxDownload = await downloadDocxPromise;
  expect(docxDownload.suggestedFilename().toLowerCase().endsWith('.docx')).toBeTruthy();

  await exportButton.click();
  const downloadPdfPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /PDF \(\.pdf\)/i }).click();
  const pdfDownload = await downloadPdfPromise;
  expect(pdfDownload.suggestedFilename().toLowerCase().endsWith('.pdf')).toBeTruthy();
});
