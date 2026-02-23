import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SpreadsheetData } from '@/types';
import { evaluateSpreadsheetCellValue, parseSpreadsheetContent } from '@/lib/spreadsheet';
import styles from './spreadsheet-editor.module.css';

interface SpreadsheetEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function SpreadsheetEditor({ content, onChange }: SpreadsheetEditorProps) {
  const initialData = useMemo(() => {
    return parseSpreadsheetContent(content) as SpreadsheetData;
  }, [content]);

  const [data, setData] = useState(initialData.data);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    if (!editingCell) {
      setData(initialData.data);
    }
  }, [initialData.data, editingCell]);

  const handleCellClick = (r: number, c: number) => {
    setSelectedCell({ r, c });
    setEditingCell(null);
  };

  const handleCellDoubleClick = (r: number, c: number) => {
    setEditingCell({ r, c });
    setEditingValue(String(data[r]?.[c] ?? ''));
  };

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
    
    setTimeout(() => {
      onChange(JSON.stringify({
        ...initialData,
        data: newData,
        rowCount: newData.length,
        colCount: newData[0]?.length ?? initialData.colCount,
      }));
    }, 0);
  }, [data, initialData, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;

    if (e.key === 'Enter') {
      if (editingCell) {
        commitChange(editingCell.r, editingCell.c, editingValue);
      } else {
        setEditingCell({ r, c });
        setEditingValue(String(data[r]?.[c] ?? ''));
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (!editingCell) {
      if (e.key === 'ArrowUp' && r > 0) setSelectedCell({ r: r - 1, c });
      if (e.key === 'ArrowDown' && r < data.length - 1) setSelectedCell({ r: r + 1, c });
      if (e.key === 'ArrowLeft' && c > 0) setSelectedCell({ r, c: c - 1 });
      if (e.key === 'ArrowRight' && c < (data[0]?.length ?? 1) - 1) setSelectedCell({ r, c: c + 1 });
    }
  };

  return (
    <div id="print-content" className={styles.spreadsheetContainer} onKeyDown={handleKeyDown} tabIndex={0}>
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
          onBlur={() => editingCell && commitChange(editingCell.r, editingCell.c, editingValue)}
        />
      </div>

      <div className={styles.gridWrapper}>
        <div 
          className={styles.grid}
          style={{ gridTemplateColumns: `40px repeat(${initialData.colHeaders.length}, 100px)` }}
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
