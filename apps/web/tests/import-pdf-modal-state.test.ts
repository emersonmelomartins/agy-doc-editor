import test from 'node:test';
import assert from 'node:assert/strict';
import { getImportPdfOptionsState } from '../src/components/import-pdf-modal-state.ts';

test('modal state disables both options while importing', () => {
  const state = getImportPdfOptionsState({
    isImporting: true,
    apiStatus: 'online',
    capabilities: { pdfToDocxAvailable: true, ocrAvailable: true, pdfRasterizationAvailable: true },
  });

  assert.equal(state.disableFidelity, true);
  assert.equal(state.disableEditable, true);
});

test('modal state blocks actions when backend is offline', () => {
  const state = getImportPdfOptionsState({
    isImporting: false,
    apiStatus: 'offline',
    capabilities: null,
  });

  assert.equal(state.isBackendOffline, true);
  assert.equal(state.disableFidelity, true);
  assert.equal(state.disableEditable, true);
});

test('modal state enables editable only when api is online and conversion is available', () => {
  const state = getImportPdfOptionsState({
    isImporting: false,
    apiStatus: 'online',
    capabilities: { pdfToDocxAvailable: true, ocrAvailable: true, pdfRasterizationAvailable: true },
  });

  assert.equal(state.disableFidelity, false);
  assert.equal(state.disableEditable, false);
});
