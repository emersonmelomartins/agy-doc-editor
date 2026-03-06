import { importDocumentFile, plainTextToTipTapContent } from '@/lib/import-documents';
import { convertPdfToDocx, importPdfEditable } from '@/lib/api-client';
import { estimateTipTapTextLength } from '@/utils/tiptap-text';
import {
  importEditablePdfDocxFirstWithDeps,
  type EditablePdfFlowDeps,
  type ImportedTextDocument,
} from './pdf-editable-flow-core';

const defaultDeps: EditablePdfFlowDeps = {
  convertPdfToDocx,
  importDocumentFile,
  importPdfEditable,
  plainTextToTipTapContent,
  estimateTipTapTextLength,
};

export async function importEditablePdfDocxFirst(
  file: File,
  deps: EditablePdfFlowDeps = defaultDeps,
): Promise<ImportedTextDocument> {
  return importEditablePdfDocxFirstWithDeps(file, deps);
}
