import React from 'react';
import './AyuTable.css';

interface Column<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface AyuTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
  hoverable?: boolean;
  onRowClick?: (record: T, index: number) => void;
}

const AyuTable = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyText = 'No data available',
  className = '',
  size = 'md',
  striped = true,
  hoverable = true,
  onRowClick,
}: AyuTableProps<T>) => {
  const baseClasses = 'ayu-table';
  const sizeClasses = `ayu-table--${size}`;
  const stripedClasses = striped ? 'ayu-table--striped' : '';
  const hoverableClasses = hoverable ? 'ayu-table--hoverable' : '';

  const tableClasses = [
    baseClasses,
    sizeClasses,
    stripedClasses,
    hoverableClasses,
    className,
  ].filter(Boolean).join(' ');

  const getCellValue = (column: Column<T>, record: T, index: number) => {
    if (column.render) {
      return column.render(column.dataIndex ? record[column.dataIndex] : record[column.key], record, index);
    }
    return column.dataIndex ? record[column.dataIndex] : record[column.key];
  };

  if (loading) {
    return (
      <div className="ayu-table-container">
        <div className="ayu-table-loading">
          <div className="ayu-table-spinner" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="ayu-table-container">
        <div className="ayu-table-empty">
          <span>{emptyText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ayu-table-container">
      <table className={tableClasses}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(record, index)}
              className={onRowClick ? 'ayu-table-row--clickable' : ''}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    textAlign: column.align || 'left',
                  }}
                >
                  {getCellValue(column, record, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AyuTable;
