import React from 'react';
import { clsx } from 'clsx';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className }) => (
  <div className="overflow-x-auto">
    <table className={clsx('min-w-full divide-y divide-gray-200', className)}>
      {children}
    </table>
  </div>
);

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => (
  <thead className={clsx('bg-gray-50', className)}>
    {children}
  </thead>
);

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className }) => (
  <tbody className={clsx('bg-white divide-y divide-gray-200', className)}>
    {children}
  </tbody>
);

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className, hover = true }) => (
  <tr className={clsx(
    hover && 'hover:bg-gray-50',
    className
  )}>
    {children}
  </tr>
);

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className }) => (
  <th className={clsx(
    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
    className
  )}>
    {children}
  </th>
);

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className }) => (
  <td className={clsx('px-6 py-4 whitespace-nowrap text-sm text-gray-900', className)}>
    {children}
  </td>
);
