import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react'
import { adminsAPI } from '../services/api'
import Modal from '../components/common/Modal'
import Badge from '../components/common/Badge'
import { PageLoader } from '../components/common/Spinner'
import { useAuth } from '../hooks/useAuth'

const roleBadge = {
  superadmin: 'danger',
  admin: 'info',
  moderator: 'warning',
}

function AdminForm({ initial, onSubmit, loading, isEdit }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    role: initial?.role || 'admin',
    password: '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-app">Name</label>
        <input className="input-field mt-1" value={form.name} onChange={set('name')} required />
      </div>
      <div>
        <label className="text-sm font-medium text-app">Email</label>
        <input type="email" className="input-field mt-1" value={form.email} onChange={set('email')} required />
      </div>
      <div>
        <label className="text-sm font-medium text-app">Role</label>
        <select className="input-field mt-1" value={form.role} onChange={set('role')}>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="superadmin">Super Admin</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-app">
          Password {isEdit && <span className="text-muted">(leave blank to keep)</span>}
        </label>
        <input
          type="password"
          className="input-field mt-1"
          value={form.password}
          onChange={set('password')}
          required={!isEdit}
          placeholder={isEdit ? 'Leave blank to keep current' : ''}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
          {loading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
          {isEdit ? 'Update Admin' : 'Create Admin'}
        </button>
      </div>
    </form>
  )
}

export default function UsersPage() {
  const { admin: currentAdmin } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | { type: 'edit', admin } | { type: 'delete', admin }
  const [error, setError] = useState('')

  const isSuperAdmin = currentAdmin?.role === 'superadmin'

  useEffect(() => {
    loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const res = await adminsAPI.list()
      setAdmins(res.data)
    } catch (e) {
      setError('Failed to load admins')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(form) {
    setActionLoading(true)
    try {
      await adminsAPI.create(form)
      await loadAdmins()
      setModal(null)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create admin')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpdate(form) {
    setActionLoading(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      await adminsAPI.update(modal.admin.id, payload)
      await loadAdmins()
      setModal(null)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update admin')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      await adminsAPI.delete(modal.admin.id)
      await loadAdmins()
      setModal(null)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete admin')
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-app">Users</h1>
          <p className="text-muted text-sm mt-1">{admins.length} admin accounts</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setModal('create')}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <Plus size={16} />
            Add Admin
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input-field pl-10"
          placeholder="Search admins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-app">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Admin</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Created</th>
                {isSuperAdmin && (
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  className="border-b border-app last:border-0 hover:bg-surface/50 transition-colors duration-100"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-app flex items-center gap-1.5">
                          {a.name}
                          {a.id === currentAdmin?.id && (
                            <span className="text-xs text-muted font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge label={a.role} variant={roleBadge[a.role] || 'default'} dot />
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-muted">
                      {new Date(a.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ type: 'edit', admin: a })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-app hover:bg-surface transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        {a.id !== currentAdmin?.id && (
                          <button
                            onClick={() => setModal({ type: 'delete', admin: a })}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted text-sm">
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    No admins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Add New Admin">
        <AdminForm onSubmit={handleCreate} loading={actionLoading} isEdit={false} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Edit Admin">
        <AdminForm initial={modal?.admin} onSubmit={handleUpdate} loading={actionLoading} isEdit />
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={modal?.type === 'delete'} onClose={() => setModal(null)} title="Delete Admin" size="sm">
        <p className="text-sm text-muted mb-6">
          Are you sure you want to delete <strong className="text-app">{modal?.admin?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1 flex items-center justify-center gap-2" disabled={actionLoading}>
            {actionLoading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
