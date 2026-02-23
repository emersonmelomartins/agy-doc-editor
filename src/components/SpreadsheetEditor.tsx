'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { SpreadsheetData } from '@/types';
import styles from './SpreadsheetEditor.module.css';

interface SpreadsheetEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function SpreadsheetEditor({ content, onChange }: SpreadsheetEditorProps) {
  // Stabilize initial data but also allow external updates if not editing
  const initialData = useMemo(() => {
    try {
      if (!content) return { data: [['']], colHeaders: ['A'], rowCount: 1, colCount: 1 };
      const parsed = JSON.parse(content);
      return {
        data: parsed.data || [['']],
        colHeaders: parsed.colHeaders || ['A'],
        rowCount: parsed.rowCount || 1,
        colCount: parsed.colCount || 1
      } as SpreadsheetData;
    } catch (e) {
      return { data: [['']], colHeaders: ['A'], rowCount: 1, colCount: 1 };
    }
  }, [content]);

  const [data, setData] = useState(initialData.data);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Sync data state with prop only if we are not editing
  useEffect(() => {
    if (!editingCell) {
      setData(initialData.data);
    }
  }, [initialData.data, editingCell]);

  // Handle cell click
  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c });
    setEditingCell(null);
  };

  // Handle cell double click
  const handleCellDoubleClick = (r: number, c: number) => {
    setEditingCell({ r, c });
    setEditingValue(String(data[r][c] || ''));
  };

  // Handle value commit
  const commitChange = useCallback((r: number, c: number, val: string) => {
    const newData = [...data];
    newData[r] = [...newData[r]];
    
    if (!val.startsWith('=') && !isNaN(Number(val)) && val.trim() !== '') {
      newData[r][c] = Number(val);
    } else {
      newData[r][c] = val;
    }
    
    setData(newData);
    setEditingCell(null);
    
    // Defer the external update to avoid interrupting the immediate UI state
    setTimeout(() => {
      onChange(JSON.stringify({
        ...initialData,
        data: newData
      }));
    }, 0);
  }, [data, initialData, onChange]);

  // Basic formula evaluator (Placeholder for more complex logic)
  const evaluateCell = useCallback((val: string | number | null): string => {
    if (typeof val === 'string' && val.startsWith('=')) {
      const formula = val.toUpperCase();
      
      // Basic SUM implementation: =SUM(A1:B2)
      const sumMatch = formula.match(/^=SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/);
      if (sumMatch) {
        const [, startCol, startRow, endCol, endRow] = sumMatch;
        const startC = startCol.charCodeAt(0) - 65;
        const startR = parseInt(startRow) - 1;
        const endC = endCol.charCodeAt(0) - 65;
        const endR = parseInt(endRow) - 1;

        let total = 0;
        for (let r = Math.min(startR, endR); r <= Math.max(startR, endR); r++) {
          for (let c = Math.min(startC, endC); c <= Math.max(startC, endC); c++) {
            const cellValue = data[r]?.[c];
            if (typeof cellValue === 'number') {
              total += cellValue;
            } else if (typeof cellValue === 'string' && !isNaN(Number(cellValue))) {
              total += Number(cellValue);
            }
          }
        }
        return String(total);
      }
      
      return val.substring(1); 
    }
    return String(val ?? '');
  }, [data]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;

    if (e.key === 'Enter') {
      if (editingCell) {
        commitChange(editingCell.r, editingCell.c, editingValue);
      } else {
        setEditingCell({ r, c });
        setEditingValue(String(data[r][c] || ''));
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (!editingCell) {
      if (e.key === 'ArrowUp' && r > 0) setSelectedCell({ r: r - 1, c });
      if (e.key === 'ArrowDown' && r < initialData.rowCount - 1) setSelectedCell({ r: r + 1, c });
      if (e.key === 'ArrowLeft' && c > 0) setSelectedCell({ r, c: c - 1 });
      if (e.key === 'ArrowRight' && c < initialData.colCount - 1) setSelectedCell({ r, c: c + 1 });
    }
  };

  return (
    <div className={styles.spreadsheetContainer} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className={styles.formulaBar}>
        <div className={styles.formulaIcon}>fx</div>
        <input 
          className={styles.formulaInput}
          value={editingCell ? editingValue : (selectedCell ? String(data[selectedCell.r][selectedCell.c] || '') : '')}
          onChange={(e) => {
            if (editingCell) {
              setEditingValue(e.target.value);
            } else if (selectedCell) {
              setEditingCell(selectedCell);
              setEditingValue(e.target.value);
            }
          }}
          onBlur={() => editingCell && commitChange(editingCell.r, editingCell.c, editingValue)}
        />
      </div>

      <div className={styles.gridWrapper}>
        <div 
          className={styles.grid}
          style={{ gridTemplateColumns: `40px repeat(${initialData.colCount}, 100px)` }}
        >
          {/* Corner */}
          <div className={`${styles.headerCell} ${styles.cornerHeader}`}></div>
          
          {/* Column Headers */}
          {initialData.colHeaders.map((h, i) => (
            <div key={i} className={styles.headerCell}>{h}</div>
          ))}

          {/* Rows */}
          {data.map((row, r) => (
            <React.Fragment key={r}>
              {/* Row Header */}
              <div className={`${styles.headerCell} ${styles.rowHeader}`}>{r + 1}</div>
              
              {/* Cells */}
              {row.map((cell, c) => {
                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                const isEditing = editingCell?.r === r && editingCell?.c === c;

                return (
                  <div 
                    key={`${r}-${c}`}
                    className={`${styles.cell} ${isSelected ? styles.activeCell : ''}`}
                    onClick={() => handleCellClick(r, c)}
                    onDoubleClick={() => handleCellDoubleClick(r, c)}
                  >
                    {isEditing ? (
                      <input 
                        autoFocus
                        className={styles.cellInput}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitChange(r, c, editingValue)}
                      />
                    ) : (
                      <div className={`${styles.cellDisplay} ${typeof cell === 'number' ? styles.numberCell : ''}`}>
                        {evaluateCell(cell)}
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
