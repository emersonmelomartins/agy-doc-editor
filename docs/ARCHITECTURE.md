# Architecture Documentation

This document describes the technical architecture and design decisions of the Document Editor project.

## 🏗️ Project Structure

The project follows a standard Next.js directory structure:

- `/src/app`: Application routes and layout (Next.js App Router).
- `/src/components`: UI components, including the main editors.
- `/src/lib`: Logic for data storage, templates, and export functions.
- `/src/types`: TypeScript interfaces and type definitions.
- `/docs`: Project documentation and guides.

## 💾 Data Management

To provide a seamless experience without requiring a backend for the initial version, the application uses `localStorage` for data persistence.

- **Storage Logic**: Located in `src/lib/storage.ts`.
- **Structure**: Documents are stored as an array of objects containing metadata (id, title, type) and content (stringified JSON).

## 📝 Editor Implementations

### Text Editor (`TextEditor.tsx`)
Built on top of **Tiptap**, a headless editor framework. It leverages various extensions for advanced formatting. The state is synchronized with the parent component through an `onChange` callback that passes the editor's JSON content.

### Spreadsheet Editor (`SpreadsheetEditor.tsx`)
A custom-built React component that renders a grid of inputs.
- **Formula Evaluation**: Uses a regex-based parser to evaluate formulas like `=SUM()`.
- **State**: Maintains a 2D array of data.

## 📤 Export System

The export logic is modularized into separate files in `src/lib/`:

1.  **DOCX (`exportDocx.ts`)**: Uses the `docx` library to map Tiptap JSON nodes to Word document elements.
2.  **XLSX (`exportXlsx.ts`)**: Uses the `xlsx` (SheetJS) library to convert 2D arrays into Excel sheets.
3.  **PDF (`exportPdf.ts`)**: Uses `html2canvas` to capture the editor DOM and `jspdf` to generate the PDF file.

## 🎨 Styling

The project uses **CSS Modules** for component-level styling, ensuring no class name collisions and a maintainable CSS structure. Global variables for colors and themes are defined in `src/app/globals.css`.
