export type ImportedTextDocument = {
  name: string;
  content: string;
};

export type EditablePdfFlowDeps = {
  convertPdfToDocx: (file: File) => Promise<Blob>;
  importDocumentFile: (file: File) => Promise<ImportedTextDocument>;
  importPdfEditable: (file: File) => Promise<{ data: { text: string } }>;
  plainTextToTipTapContent: (text: string) => string;
  estimateTipTapTextLength: (serializedContent: string) => number;
};

export async function importEditablePdfDocxFirstWithDeps(
  file: File,
  deps: EditablePdfFlowDeps,
): Promise<ImportedTextDocument> {
  const docxBlob = await deps.convertPdfToDocx(file);
  const docxName = `${file.name.replace(/\.pdf$/i, '')}.docx`;
  const docxFile = new File([docxBlob], docxName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  let imported = await deps.importDocumentFile(docxFile);

  try {
    const extractedResponse = await deps.importPdfEditable(file);
    const extractedText = extractedResponse?.data?.text?.trim() ?? '';
    const importedTextLength = deps.estimateTipTapTextLength(imported.content);

    if (
      extractedText.length >= 96
      && (importedTextLength < 48 || extractedText.length > importedTextLength * 1.4)
    ) {
      imported = {
        ...imported,
        content: deps.plainTextToTipTapContent(extractedText),
      };
    }
  } catch {
    // Keep DOCX-imported content when text reinforcement fails.
  }

  return imported;
}
