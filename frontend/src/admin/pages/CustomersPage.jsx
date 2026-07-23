import React, { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

import CustomerAnalyticsCards from '@/admin/components/customers/CustomerAnalyticsCards'
import CustomerFilters from '@/admin/components/customers/CustomerFilters'
import CustomerTable from '@/admin/components/customers/CustomerTable'
import CustomerPagination from '@/admin/components/customers/CustomerPagination'
import CustomerDrawer from '@/admin/components/customers/CustomerDrawer'
import CustomerFormModal from '@/admin/components/customers/CustomerFormModal'
import PageHeader from '@/shared/components/ui/PageHeader'
import Button from '@/shared/components/ui/Button'
import { customersAPI } from '@/shared/services/api'
import { useDebounce } from '@/shared/utils/productUtils'

// ─── Export helper (CSV) ──────────────────────────────────────────────────────
function exportToCSV(customers) {
  const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Tags', 'Orders', 'Total Spent', 'Joined']
  const rows = customers.map(c => [
    c.id, c.first_name, c.last_name, c.email,
    c.phone ?? '', c.is_active ? 'Active' : 'Inactive',
    (c.tags || []).join(';'), c.total_orders, c.total_spent,
    new Date(c.created_at).toLocaleDateString(),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `customers-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
  toast.success('Customers exported')
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [searchParams] = useSearchParams()
  const urlStatus = searchParams.get('status') || ''

  // ── Filters & Pagination ─────────────────────────────────────────────────
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState(urlStatus)
  const [tagFilter, setTag]           = useState('')
  const [sortBy, setSortBy]           = useState('created_at')
  const [sortDir, setSortDir]         = useState('desc')
  const [page, setPage]               = useState(1)
  const [perPage, setPerPage]         = useState(20)

  const debouncedSearch = useDebounce(search, 350)

  const handleSort = useCallback((col) => {
    setSortDir(d => sortBy === col ? (d === 'asc' ? 'desc' : 'asc') : 'desc')
    setSortBy(col)
    setPage(1)
  }, [sortBy])

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleStatus = (v) => { setStatus(v); setPage(1) }
  const handleTag    = (v) => { setTag(v); setPage(1) }
  const clearAll     = () => { setSearch(''); setStatus(''); setTag(''); setPage(1) }

  // ── UI State ─────────────────────────────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState(null)  // drawer
  const [editCustomer, setEditCustomer]         = useState(null)  // form modal
  const [showCreate, setShowCreate]             = useState(false)

  // ── Data fetching ─────────────────────────────────────────────────────────
  const listParams = {
    page, per_page: perPage,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    tag: tagFilter || undefined,
    sort_by: sortBy, sort_dir: sortDir,
  }

  const { data: listData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers', listParams],
    queryFn: () => customersAPI.list(listParams).then(r => r.data),
    keepPreviousData: true,
    staleTime: 30_000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: () => customersAPI.analytics().then(r => r.data),
    staleTime: 60_000,
  })

  const customers = listData?.items ?? []
  const total     = listData?.total ?? 0
  const pages     = listData?.pages ?? 1

  return (
    <div className="space-y-6 py-2">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <PageHeader
  title="Customers"
  description={
    total > 0
      ? `${total.toLocaleString()} total customers`
      : 'Manage your customer base'
  }
  actions={
    <div className="flex items-center gap-2">
      <button
        onClick={() => refetch()}
        className="btn-secondary border rounded-md p-2 hover:bg-gray-100"
        title="Refresh"
      >
        <RefreshCw
          size={15}
          className={isFetching ? 'animate-spin' : ''}
        />
      </button>

      <Button
        onClick={() => exportToCSV(customers)}
        disabled={customers.length === 0}
        variant="download"
        className="flex items-center gap-2"
        icon={Download}
      >
        Export
      </Button>

      <Button
        onClick={() => setShowCreate(true)}
        variant="addvariant"
        className="flex items-center gap-2"
        icon={Plus}
      >
        Customer
      </Button>
    </div>
  }
/>

      {/* ── Analytics summary cards ───────────────────────────────────────── */}
      <CustomerAnalyticsCards analytics={analytics} />

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <CustomerFilters
        search={search}
        onSearch={handleSearch}
        statusFilter={statusFilter}
        onStatusFilter={handleStatus}
        tagFilter={tagFilter}
        onTagFilter={handleTag}
        total={total}
        onClearAll={clearAll}
      />

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      
      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onViewProfile={(c) => setSelectedCustomer(c.id)}
        onEdit={(c) => setEditCustomer(c)}
      />

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!isLoading && pages > 1 && (
          <CustomerPagination
              page={page}
              pages={pages}
              onPage={setPage}
          />
      )}

      {/* ── Customer profile drawer ───────────────────────────────────────── */}
      {selectedCustomer && (
        <CustomerDrawer
          customerId={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onStatusChange={() => {}}
        />
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      <CustomerFormModal
        open={!!editCustomer}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
      />

      {/* ── Create modal ──────────────────────────────────────────────────── */}
      <CustomerFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
