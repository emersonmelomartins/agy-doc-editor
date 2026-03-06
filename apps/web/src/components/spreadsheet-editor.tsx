import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SpreadsheetData, SpreadsheetMerge } from '@/types';
import {
  evaluateSpreadsheetCellValue,
  parseSpreadsheetContent,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
} from '@/lib/spreadsheet';
import styles from './spreadsheet-editor.module.css';

const ROW_HEADER_WIDTH = 40;
const MIN_COL_WIDTH = 40;
const MAX_COL_WIDTH = 400;
const MIN_ROW_HEIGHT = 20;
const MAX_ROW_HEIGHT = 200;

interface SpreadsheetEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function SpreadsheetEditor({ content, onChange }: SpreadsheetEditorProps) {
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);

  const initialData = useMemo(() => {
    return parseSpreadsheetContent(content) as SpreadsheetData;
  }, [content]);

  const [data, setData] = useState(initialData.data);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [colWidths, setColWidths] = useState<number[]>(() => initialData.colWidths ?? []);
  const [rowHeights, setRowHeights] = useState<number[]>(() => initialData.rowHeights ?? []);
  const [isResizing, setIsResizing] = useState(false);
  const [merges, setMerges] = useState<SpreadsheetMerge[]>(() => initialData.merges ?? []);
  const [cellFills, setCellFills] = useState<Record<string, string>>(() => initialData.cellFills ?? {});
  const [selectionRange, setSelectionRange] = useState<{ start: { r: number; c: number }; end: { r: number; c: number } } | null>(null);
  const [fillColorPickerOpen, setFillColorPickerOpen] = useState(false);
  const fillColorDropdownRef = useRef<HTMLDivElement>(null);
  const dragSelectRef = useRef<{ anchor: { r: number; c: number } } | null>(null);
  const resizeRef = useRef<{ col: number; startX: number; startW: number } | { row: number; startY: number; startH: number } | null>(null);
  const pendingSizesRef = useRef<{ colWidths: number[]; rowHeights: number[] } | null>(null);

  useEffect(() => {
    setColWidths(initialData.colWidths ?? []);
    setRowHeights(initialData.rowHeights ?? []);
    setMerges(initialData.merges ?? []);
    setCellFills(initialData.cellFills ?? {});
  }, [content]);

  useEffect(() => {
    if (!editingCell) {
      setData(initialData.data);
    }
  }, [initialData.data, editingCell]);

  useEffect(() => {
    if (!editingCell) return;
    const input = cellInputRef.current;
    if (!input) return;
    input.focus();
    // Only adjust selection when entering edit mode, not on every keystroke (editingValue change).
    // Otherwise we would select-all after each type and the next key would replace everything.
    requestAnimationFrame(() => {
      const el = cellInputRef.current;
      if (!el) return;
      const len = el.value.length;
      if (len <= 1) {
        el.setSelectionRange(len, len);
      } else {
        el.select();
      }
    });
  }, [editingCell]);

  const persistContent = useCallback(
    (updates: Partial<SpreadsheetData> & { data: (string | number | null)[][] }) => {
      const payload: SpreadsheetData = {
        ...initialData,
        data: updates.data,
        rowCount: updates.data.length,
        colCount: updates.data[0]?.length ?? initialData.colCount,
      };
      const w = updates.colWidths ?? (colWidths.length > 0 ? colWidths : undefined);
      const h = updates.rowHeights ?? (rowHeights.length > 0 ? rowHeights : undefined);
      if (w?.length) payload.colWidths = w;
      if (h?.length) payload.rowHeights = h;
      if (updates.merges !== undefined) payload.merges = updates.merges;
      if (updates.cellFills !== undefined) payload.cellFills = updates.cellFills;
      else if (Object.keys(cellFills).length > 0) payload.cellFills = cellFills;
      onChange(JSON.stringify(payload));
    },
    [initialData, onChange, colWidths, rowHeights, cellFills]
  );

  const getMergeAt = useCallback(
    (r: number, c: number): SpreadsheetMerge | null => {
      return merges.find(
        (m) => r >= m.startRow && r <= m.endRow && c >= m.startCol && c <= m.endCol
      ) ?? null;
    },
    [merges]
  );

  const isMergeMaster = useCallback(
    (r: number, c: number): boolean => {
      const m = getMergeAt(r, c);
      return m !== null && m.startRow === r && m.startCol === c;
    },
    [getMergeAt]
  );

  const isInMerge = useCallback(
    (r: number, c: number): boolean => getMergeAt(r, c) !== null,
    [getMergeAt]
  );

  const resolveToMaster = useCallback(
    (r: number, c: number): { r: number; c: number } => {
      const m = getMergeAt(r, c);
      if (m) return { r: m.startRow, c: m.startCol };
      return { r, c };
    },
    [getMergeAt]
  );

  const handleMergeCells = useCallback(() => {
    const range = selectionRange ?? (selectedCell ? { start: selectedCell, end: selectedCell } : null);
    if (!range) return;
    const { start, end } = range;
    const minR = Math.min(start.r, end.r);
    const maxR = Math.max(start.r, end.r);
    const minC = Math.min(start.c, end.c);
    const maxC = Math.max(start.c, end.c);
    if (minR === maxR && minC === maxC) return;
    const newMerges = merges.filter((m) => {
      const overlaps =
        !(m.endRow < minR || m.startRow > maxR || m.endCol < minC || m.startCol > maxC);
      return !overlaps;
    });
    newMerges.push({ startRow: minR, startCol: minC, endRow: maxR, endCol: maxC });
    const newData = data.map((row, r) =>
      row.map((cell, c) => {
        if (r >= minR && r <= maxR && c >= minC && c <= maxC && (r !== minR || c !== minC)) {
          return null;
        }
        return cell;
      })
    );
    setMerges(newMerges);
    setData(newData);
    persistContent({ data: newData, merges: newMerges });
  }, [selectionRange, selectedCell, merges, data, persistContent]);

  const handleUnmergeCells = useCallback(() => {
    const cell = selectionRange
      ? selectionRange.start
      : selectedCell;
    if (!cell) return;
    const m = getMergeAt(cell.r, cell.c);
    if (!m || (m.startRow !== cell.r || m.startCol !== cell.c)) return;
    const newMerges = merges.filter(
      (x) => !(x.startRow === m.startRow && x.startCol === m.startCol && x.endRow === m.endRow && x.endCol === m.endCol)
    );
    setMerges(newMerges);
    persistContent({ data, merges: newMerges });
  }, [selectionRange, selectedCell, getMergeAt, merges, data, persistContent]);

  const currentRange = selectionRange ?? (selectedCell ? { start: selectedCell, end: selectedCell } : null);
  const canMerge = currentRange && (currentRange.start.r !== currentRange.end.r || currentRange.start.c !== currentRange.end.c);
  const canUnmerge = currentRange && (() => {
    const m = getMergeAt(currentRange.start.r, currentRange.start.c);
    return m !== null && m.startRow === currentRange.start.r && m.startCol === currentRange.start.c;
  })();

  const handleApplyFillColor = useCallback(
    (color: string) => {
      if (!currentRange) return;
      const next: Record<string, string> = { ...cellFills };
      const minR = Math.min(currentRange.start.r, currentRange.end.r);
      const maxR = Math.max(currentRange.start.r, currentRange.end.r);
      const minC = Math.min(currentRange.start.c, currentRange.end.c);
      const maxC = Math.max(currentRange.start.c, currentRange.end.c);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          next[`${r},${c}`] = color;
        }
      }
      setCellFills(next);
      setFillColorPickerOpen(false);
      persistContent({ data, cellFills: next });
    },
    [currentRange, cellFills, data, persistContent]
  );

  const handleClearFill = useCallback(() => {
    if (!currentRange) return;
    const next = { ...cellFills };
    const minR = Math.min(currentRange.start.r, currentRange.end.r);
    const maxR = Math.max(currentRange.start.r, currentRange.end.r);
    const minC = Math.min(currentRange.start.c, currentRange.end.c);
    const maxC = Math.max(currentRange.start.c, currentRange.end.c);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        delete next[`${r},${c}`];
      }
    }
    setCellFills(next);
    setFillColorPickerOpen(false);
    persistContent({ data, cellFills: Object.keys(next).length ? next : {} });
  }, [currentRange, cellFills, data, persistContent]);

  const startColResize = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      const w = colWidths[colIndex] ?? DEFAULT_COL_WIDTH;
      resizeRef.current = { col: colIndex, startX: e.clientX, startW: w };
      const cols = initialData.colHeaders.map((_, i) => colWidths[i] ?? DEFAULT_COL_WIDTH);
      const rows = data.map((_, i) => rowHeights[i] ?? DEFAULT_ROW_HEIGHT);
      pendingSizesRef.current = { colWidths: cols, rowHeights: rows };
      setIsResizing(true);
    },
    [colWidths, rowHeights, initialData.colHeaders.length, data.length]
  );

  const startRowResize = useCallback(
    (e: React.MouseEvent, rowIndex: number) => {
      e.preventDefault();
      const h = rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT;
      resizeRef.current = { row: rowIndex, startY: e.clientY, startH: h };
      const cols = initialData.colHeaders.map((_, i) => colWidths[i] ?? DEFAULT_COL_WIDTH);
      const rows = data.map((_, i) => rowHeights[i] ?? DEFAULT_ROW_HEIGHT);
      pendingSizesRef.current = { colWidths: cols, rowHeights: rows };
      setIsResizing(true);
    },
    [colWidths, rowHeights, initialData.colHeaders.length, data.length]
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r) return;
      const pending = pendingSizesRef.current;
      if (!pending) return;
      if ('col' in r) {
        const delta = e.clientX - r.startX;
        const newW = Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, r.startW + delta));
        const next = [...pending.colWidths];
        while (next.length <= r.col) next.push(DEFAULT_COL_WIDTH);
        next[r.col] = newW;
        pendingSizesRef.current = { ...pending, colWidths: next };
        setColWidths(next);
      } else {
        const delta = e.clientY - r.startY;
        const newH = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, r.startH + delta));
        const next = [...pending.rowHeights];
        while (next.length <= r.row) next.push(DEFAULT_ROW_HEIGHT);
        next[r.row] = newH;
        pendingSizesRef.current = { ...pending, rowHeights: next };
        setRowHeights(next);
      }
    };
    const onUp = () => {
      if (resizeRef.current === null) return;
      resizeRef.current = null;
      const pending = pendingSizesRef.current;
      pendingSizesRef.current = null;
      setIsResizing(false);
      if (pending && (pending.colWidths.length > 0 || pending.rowHeights.length > 0)) {
        persistContent({
          data,
          colWidths: pending.colWidths.length > 0 ? pending.colWidths : undefined,
          rowHeights: pending.rowHeights.length > 0 ? pending.rowHeights : undefined,
        });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, data, persistContent]);

  const handleCellMouseEnter = (r: number, c: number) => {
    if (dragSelectRef.current === null) return;
    const anchor = dragSelectRef.current.anchor;
    const start = { r: Math.min(anchor.r, r), c: Math.min(anchor.c, c) };
    const end = { r: Math.max(anchor.r, r), c: Math.max(anchor.c, c) };
    setSelectionRange({ start, end });
  };

  useEffect(() => {
    const onUp = () => {
      dragSelectRef.current = null;
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    if (!fillColorPickerOpen) return;
    const onMouseUp = (e: MouseEvent) => {
      if (fillColorDropdownRef.current && !fillColorDropdownRef.current.contains(e.target as Node)) {
        setFillColorPickerOpen(false);
      }
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [fillColorPickerOpen]);

  const handleCellClick = (r: number, c: number) => {
    const master = resolveToMaster(r, c);
    setSelectedCell(master);
    setSelectionRange({ start: master, end: master });
    setEditingCell(null);
    spreadsheetContainerRef.current?.focus();
  };

  const handleCellDoubleClick = (r: number, c: number) => {
    if (!isMergeMaster(r, c) && isInMerge(r, c)) return;
    const master = resolveToMaster(r, c);
    setEditingCell(master);
    setEditingValue(String(data[master.r]?.[master.c] ?? ''));
  };

  const commitChange = useCallback(
    (r: number, c: number, val: string) => {
      const newData = [...data];
      newData[r] = [...newData[r]];

      if (!val.startsWith('=') && !isNaN(Number(val)) && val.trim() !== '') {
        newData[r][c] = Number(val);
      } else {
        newData[r][c] = val;
      }

      setData(newData);
      setEditingCell(null);

      setTimeout(() => {
        spreadsheetContainerRef.current?.focus();
      }, 0);

      setTimeout(() => {
        persistContent({ data: newData });
      }, 0);
    },
    [data, initialData, persistContent]
  );

  const handleCellMouseDown = useCallback(
    (r: number, c: number) => {
      const master = resolveToMaster(r, c);
      if (editingCell && (editingCell.r !== master.r || editingCell.c !== master.c)) {
        const val = cellInputRef.current?.value ?? editingValue;
        commitChange(editingCell.r, editingCell.c, val);
      }
      dragSelectRef.current = { anchor: master };
      setSelectedCell(master);
      setSelectionRange({ start: master, end: master });
      setEditingCell(null);
    },
    [editingCell, editingValue, commitChange, resolveToMaster]
  );

  const colCount = data[0]?.length ?? 0;
  const rowCount = data.length;

  const handleSelectColumn = useCallback(
    (colIndex: number) => {
      setEditingCell(null);
      setSelectedCell({ r: 0, c: colIndex });
      setSelectionRange(
        { start: { r: 0, c: colIndex }, end: { r: rowCount - 1, c: colIndex } }
      );
      spreadsheetContainerRef.current?.focus();
    },
    [rowCount]
  );

  const handleSelectRow = useCallback(
    (rowIndex: number) => {
      setEditingCell(null);
      setSelectedCell({ r: rowIndex, c: 0 });
      setSelectionRange(
        { start: { r: rowIndex, c: 0 }, end: { r: rowIndex, c: colCount - 1 } }
      );
      spreadsheetContainerRef.current?.focus();
    },
    [colCount]
  );

  const handleSelectAll = useCallback(() => {
    if (rowCount === 0 || colCount === 0) return;
    setEditingCell(null);
    setSelectedCell({ r: 0, c: 0 });
    setSelectionRange(
      { start: { r: 0, c: 0 }, end: { r: rowCount - 1, c: colCount - 1 } }
    );
    spreadsheetContainerRef.current?.focus();
  }, [rowCount, colCount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && currentRange) {
      e.preventDefault();
      const minR = Math.min(currentRange.start.r, currentRange.end.r);
      const maxR = Math.max(currentRange.start.r, currentRange.end.r);
      const minC = Math.min(currentRange.start.c, currentRange.end.c);
      const maxC = Math.max(currentRange.start.c, currentRange.end.c);
      const rows: string[] = [];
      for (let row = minR; row <= maxR; row++) {
        const cells: string[] = [];
        for (let col = minC; col <= maxC; col++) {
          const m = getMergeAt(row, col);
          const isCovered = m !== null && (m.startRow !== row || m.startCol !== col);
          const val = isCovered ? '' : evaluateSpreadsheetCellValue(data[row]?.[col] ?? null, data);
          cells.push(String(val).replace(/\t/g, ' ').replace(/\n/g, ' '));
        }
        rows.push(cells.join('\t'));
      }
      navigator.clipboard.writeText(rows.join('\n')).catch(() => {});
      return;
    }

    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const maxRow = data.length - 1;
    const maxCol = (data[0]?.length ?? 1) - 1;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingCell) {
        const value = (document.activeElement instanceof HTMLInputElement ? document.activeElement.value : undefined) ?? editingValue;
        commitChange(editingCell.r, editingCell.c, value);
        const nextRow = Math.min(editingCell.r + 1, maxRow);
        setSelectedCell({ r: nextRow, c: editingCell.c });
        setSelectionRange({ start: { r: nextRow, c: editingCell.c }, end: { r: nextRow, c: editingCell.c } });
      } else {
        setEditingCell({ r, c });
        setEditingValue(String(data[r]?.[c] ?? ''));
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (editingCell) {
        const value = (document.activeElement instanceof HTMLInputElement ? document.activeElement.value : undefined) ?? editingValue;
        commitChange(editingCell.r, editingCell.c, value);
      }
      if (e.shiftKey) {
        const nextCol = Math.max(c - 1, 0);
        setSelectedCell({ r, c: nextCol });
        setSelectionRange({ start: { r, c: nextCol }, end: { r, c: nextCol } });
      } else {
        const nextCol = Math.min(c + 1, maxCol);
        setSelectedCell({ r, c: nextCol });
        setSelectionRange({ start: { r, c: nextCol }, end: { r, c: nextCol } });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    } else if (!editingCell) {
      if (e.key === 'ArrowUp' && r > 0) {
        e.preventDefault();
        setSelectedCell({ r: r - 1, c });
      } else if (e.key === 'ArrowDown' && r < maxRow) {
        e.preventDefault();
        setSelectedCell({ r: r + 1, c });
      } else if (e.key === 'ArrowLeft' && c > 0) {
        e.preventDefault();
        setSelectedCell({ r, c: c - 1 });
      } else if (e.key === 'ArrowRight' && c < maxCol) {
        e.preventDefault();
        setSelectedCell({ r, c: c + 1 });
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !['Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      ) {
        e.preventDefault();
        setEditingCell({ r, c });
        setEditingValue(e.key);
      }
    }
  };

  return (
    <div ref={spreadsheetContainerRef} id="print-content" className={styles.spreadsheetContainer} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className={styles.formulaBar}>
        <div className={styles.formulaIcon}>fx</div>
        <input
          className={styles.formulaInput}
          value={editingCell ? editingValue : (selectedCell ? String(data[selectedCell.r]?.[selectedCell.c] ?? '') : '')}
          onChange={(e) => {
            if (editingCell) {
              setEditingValue(e.target.value);
            } else if (selectedCell) {
              setEditingCell(selectedCell);
              setEditingValue(e.target.value);
            }
          }}
          onBlur={(e) => {
            const target = e.target as HTMLInputElement;
            if (editingCell) commitChange(editingCell.r, editingCell.c, target.value);
          }}
        />
        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleMergeCells}
            disabled={!canMerge}
            title="Mesclar células"
          >
            Mesclar
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={handleUnmergeCells}
            disabled={!canUnmerge}
            title="Desmesclar células"
          >
            Desmesclar
          </button>
          <div className={styles.fillColorWrap} ref={fillColorDropdownRef}>
            <button
              type="button"
              className={styles.toolbarBtn}
              onClick={() => setFillColorPickerOpen((open) => !open)}
              disabled={!currentRange}
              title="Cor de fundo"
            >
              Cor de fundo
            </button>
            {fillColorPickerOpen && (
              <div className={styles.fillColorDropdown}>
                <input
                  type="color"
                  className={styles.fillColorInput}
                  defaultValue="#ffff00"
                  onChange={(e) => handleApplyFillColor(e.target.value)}
                />
                <button type="button" className={styles.toolbarBtn} onClick={handleClearFill}>
                  Limpar cor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.gridWrapper}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: [
              `${ROW_HEADER_WIDTH}px`,
              ...initialData.colHeaders.map((_, i) => `${colWidths[i] ?? DEFAULT_COL_WIDTH}px`),
            ].join(' '),
            gridTemplateRows: [
              '28px',
              ...data.map((_, r) => `${rowHeights[r] ?? DEFAULT_ROW_HEIGHT}px`),
            ].join(' '),
          }}
        >
          {/* Corner */}
          <div
            className={`${styles.headerCell} ${styles.cornerHeader}`}
            onClick={handleSelectAll}
            role="button"
            title="Selecionar tudo"
          />

          {/* Column Headers with resize handle */}
          {initialData.colHeaders.map((h, i) => (
            <div key={i} className={`${styles.headerCell} ${styles.colHeaderWrap}`}>
              <span onClick={() => handleSelectColumn(i)} role="button" title="Selecionar coluna">
                {h}
              </span>
              <div
                className={styles.resizeColHandle}
                onMouseDown={(e) => { e.stopPropagation(); startColResize(e, i); }}
                title="Arrastar para redimensionar coluna"
              />
            </div>
          ))}

          {/* Rows */}
          {data.map((row, r) => (
            <React.Fragment key={r}>
              {/* Row Header with resize handle */}
              <div className={`${styles.headerCell} ${styles.rowHeader} ${styles.rowHeaderWrap}`}>
                <span onClick={() => handleSelectRow(r)} role="button" title="Selecionar linha">
                  {r + 1}
                </span>
                <div
                  className={styles.resizeRowHandle}
                  onMouseDown={(e) => { e.stopPropagation(); startRowResize(e, r); }}
                  title="Arrastar para redimensionar linha"
                />
              </div>
              
              {/* Cells */}
              {row.map((cell, c) => {
                const merge = getMergeAt(r, c);
                const isMaster = merge !== null && merge.startRow === r && merge.startCol === c;
                const isCovered = merge !== null && !isMaster;
                const isInRange =
                  currentRange &&
                  r >= currentRange.start.r &&
                  r <= currentRange.end.r &&
                  c >= currentRange.start.c &&
                  c <= currentRange.end.c;
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isEditing = editingCell?.r === r && editingCell?.c === c;

                const gridCol = c + 2;
                const gridRow = r + 2;

                const fillStyle = cellFills[`${r},${c}`] ? { backgroundColor: cellFills[`${r},${c}`] } : undefined;

                if (isCovered) {
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`${styles.cell} ${styles.mergePlaceholder} ${isInRange ? styles.rangeSelected : ''}`}
                      style={{ gridColumn: gridCol, gridRow, ...fillStyle }}
                      onMouseDown={() => handleCellMouseDown(r, c)}
                      onMouseEnter={() => handleCellMouseEnter(r, c)}
                      onClick={() => handleCellClick(r, c)}
                    />
                  );
                }

                const spanStyle: React.CSSProperties =
                  isMaster && merge
                    ? {
                        gridColumn: `${gridCol} / span ${merge.endCol - merge.startCol + 1}`,
                        gridRow: `${gridRow} / span ${merge.endRow - merge.startRow + 1}`,
                        ...fillStyle,
                      }
                    : { gridColumn: gridCol, gridRow, ...fillStyle };

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`${styles.cell} ${isSelected ? styles.activeCell : ''} ${isInRange ? styles.rangeSelected : ''}`}
                    style={spanStyle}
                    onMouseDown={() => handleCellMouseDown(r, c)}
                    onMouseEnter={() => handleCellMouseEnter(r, c)}
                    onClick={() => handleCellClick(r, c)}
                    onDoubleClick={() => handleCellDoubleClick(r, c)}
                  >
                    {isEditing ? (
                      <input
                        ref={cellInputRef}
                        autoFocus
                        className={styles.cellInput}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={(e) => commitChange(r, c, (e.target as HTMLInputElement).value)}
                      />
                    ) : (
                      <div className={`${styles.cellDisplay} ${typeof cell === 'number' ? styles.numberCell : ''}`}>
                        {evaluateSpreadsheetCellValue(cell, data)}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
