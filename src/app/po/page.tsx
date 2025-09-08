"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";
import { PurchaseOrder, POStatus } from "@/types/po";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useState, useMemo } from "react";
import Papa from "papaparse";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

const fetchPOs = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/po?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};

const IndeterminateCheckbox = ({ indeterminate, ...rest }: { indeterminate?: boolean, [key: string]: any }) => {
  const ref = React.useRef<HTMLInputElement>(null!);
  React.useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);
  return <input type="checkbox" ref={ref} {...rest} />;
};

export default function POListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [rowSelection, setRowSelection] = useState({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["purchaseOrders", page, pageSize],
    queryFn: () => fetchPOs(page, pageSize),
  });

  const pos = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  const bulkUpdateMutation = useMutation({
    mutationFn: (variables: { poIds: string[], status: POStatus }) =>
      fetch('/api/po/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      }).then(res => {
        if (!res.ok) throw new Error('Bulk update failed');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setRowSelection({});
    },
  });

  const columns = useMemo<ColumnDef<PurchaseOrder>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <IndeterminateCheckbox {...{ checked: table.getIsAllRowsSelected(), indeterminate: table.getIsSomeRowsSelected(), onChange: table.getToggleAllRowsSelectedHandler() }} />
      ),
      cell: ({ row }) => (
        <IndeterminateCheckbox {...{ checked: row.getIsSelected(), disabled: !row.getCanSelect(), indeterminate: row.getIsSomeSelected(), onChange: row.getToggleSelectedHandler() }} />
      ),
    },
    { header: 'PO Number', accessorKey: 'poNumber' },
    { header: 'Title', accessorKey: 'title' },
    { header: 'Vendor', accessorKey: 'vendorName' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Total', accessorKey: 'grandTotal', cell: info => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(info.getValue() as number) },
    {
      id: 'actions',
      cell: ({ row }) => <Link href={`/po/${row.original.id}`} className="text-blue-600">View</Link>,
    },
  ], []);

  const table = useReactTable({
    data: pos,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleBulkUpdate = (status: POStatus) => {
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id!);
    if (selectedIds.length === 0) {
      alert("Please select at least one PO.");
      return;
    }
    bulkUpdateMutation.mutate({ poIds: selectedIds, status });
  };

  // ... (other handlers like handleExportCsv)

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <div className="space-x-4">
             <Link href="/po/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Create New PO</Link>
          </div>
        </div>

        {/* Bulk Actions */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4 flex items-center space-x-4">
            <p className="text-sm font-medium">{Object.keys(rowSelection).length} selected</p>
            <button onClick={() => handleBulkUpdate(POStatus.APPROVED)} className="bg-green-500 text-white px-3 py-1 text-sm rounded">Approve Selected</button>
            <button onClick={() => handleBulkUpdate(POStatus.REJECTED)} className="bg-red-500 text-white px-3 py-1 text-sm rounded">Reject Selected</button>
            {bulkUpdateMutation.isPending && <p className="text-sm">Updating...</p>}
          </div>
        )}

        <div className="bg-white shadow overflow-x-auto sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Page {page} of {pageCount}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-2 text-sm rounded-md border">Previous</button>
            <button onClick={() => setPage(page + 1)} disabled={page >= pageCount} className="px-4 py-2 text-sm rounded-md border">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}