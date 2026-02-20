'use client';

import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class merging

interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    pagination?: {
        page: number;
        limit: number;
        totalRows: number;
        totalPages: number;

    };
    onPageChange?: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function DataTable<T extends { [key: string]: any }>({
    data,
    columns,
    isLoading,
    pagination,
    onPageChange,
    onLimitChange,
    title,
    description,
    action
}: DataTableProps<T>) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 flex flex-col h-full">
            {(title || action) && (
                <div className="p-6 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between">
                    <div>
                        {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
                        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
                    </div>
                    {action}
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={cn("px-6 py-4 whitespace-nowrap", col.className)}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex justify-center items-center gap-2 text-gray-500">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Loading data...
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            data.map((item, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
                                >
                                    {columns.map((col, colIdx) => {
                                        const raw = col.cell ? col.cell(item) : item[col.accessorKey as string];
                                        const isEmpty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '');
                                        return (
                                        <td key={colIdx} className={cn("px-6 py-4", col.className)}>
                                            {isEmpty ? '-' : raw}
                                        </td>
                                    );})}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <div className="p-4 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-900">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.totalRows)}</span> of <span className="font-medium text-gray-900 dark:text-white">{pagination.totalRows}</span> results
                        </div>
                        {onLimitChange && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Rows per page:</span>
                                <select
                                    className="h-8 w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
                                    value={pagination.limit}
                                    onChange={(e) => onLimitChange(Number(e.target.value))}
                                >
                                    {[10, 20, 50, 100].map((pageSize) => (
                                        <option key={pageSize} value={pageSize}>
                                            {pageSize}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange?.(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="text-sm font-medium px-4">
                            Page {pagination.page} of {pagination.totalPages}
                        </div>
                        <button
                            onClick={() => onPageChange?.(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
