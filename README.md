# Document Editor & Spreadsheet

A modern, full-featured web application for creating and editing documents and spreadsheets, built with Next.js and TypeScript.

## 🚀 Features

### 📝 Text Editor
- **Rich Text Editing**: Powered by Tiptap, supporting bold, italics, underlines, headings, and more.
- **Advanced Components**: Support for images, tables, code blocks, and blockquotes.
- **Export Options**: Export your documents to **PDF** and **Microsoft Word (DOCX)**.

### 📊 Spreadsheet Editor
- **Grid Interface**: Intuitive spreadsheet interface for data management.
- **Formula Support**: Basic formula support, including `=SUM(A1:B10)`.
- **Dynamic Headers**: Automatic A-Z column headers and row numbering.
- **Excel Export**: Export your spreadsheets directly to **XLSX**.

### 🎨 Design & Experience
- **Dark Mode**: Beautifully crafted dark mode for a premium feel.
- **Responsive Layout**: Designed to work across different screen sizes.
- **Local Storage**: Auto-saves your work locally to ensure you never lose data.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS with CSS Modules
- **State Management**: React Hooks & LocalStorage
- **Libraries**:
  - `Tiptap` (Editor core)
  - `docx` (Word export)
  - `xlsx` (Excel export)
  - `jspdf` & `html2canvas` (PDF export)
  - `lucide-react` (Icons)

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📄 License

MIT
