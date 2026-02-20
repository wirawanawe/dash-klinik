'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Database } from 'lucide-react';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

export default function TablesPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/tables`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();

            // Transform array of strings/objects to suitable format if needed
            if (Array.isArray(json)) {
                // Check if it's string array or object array with TABLE_NAME
                // Controller returns result.recordset which is [{ TABLE_NAME: '...' }, ...]
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        {
            header: 'Table Name',
            accessorKey: 'TABLE_NAME',
            className: 'font-medium',
            cell: (item: any) => (
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    {item.TABLE_NAME}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tables</h1>
            </div>

            <DataTable
                title="Database Tables"
                description="List of all tables in the connected database."
                data={data}
                columns={columns}
                isLoading={loading}
                onPageChange={() => { }} // No pagination for this list in controller
            />
        </div>
    );
}
