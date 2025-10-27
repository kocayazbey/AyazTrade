'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState } from 'react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  loading?: boolean;
  emptyText?: string;
}

export default function Table({ columns, data, onSort, loading, emptyText = 'Veri bulunamadı' }: TableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-12 bg-ios-gray-200 rounded-ios flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-ios-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-ios-gray-50 border-b border-ios-gray-200">
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-semibold text-ios-gray-700 uppercase ${column.className || ''}`}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-1 hover:text-ios-blue transition-colors"
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )
                    ) : (
                      <ArrowUpDown className="w-4 h-4 opacity-30" />
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ios-gray-200">
          {data.map((row, index) => (
            <tr key={index} className="hover:bg-ios-gray-50 transition-colors">
              {columns.map(column => (
                <td key={column.key} className={`px-6 py-4 ${column.className || ''}`}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


