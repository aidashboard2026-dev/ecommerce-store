/**
 * src/components/products/CategoryCollectionModal.jsx
 * Management UI for Categories & Collections — create, rename, delete.
 * Wired to backend routes that already existed but were never exposed
 * in the frontend (categoriesAPI / collectionsAPI create|update|delete).
 */

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Check, X, Loader2, AlertTriangle, Tag, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from '@/shared/components/ui/Modal'
import { categoriesAPI, collectionsAPI } from '@/shared/services/api'

// ─── Shared row component (works for both categories and collections) ────────

function EditableRow({ item, onSave, onDelete, isSaving, isDeleting, extra }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const startEdit = () => { setName(item.name); setEditing(true) }
  const cancelEdit = () => { setName(item.name); setEditing(false) }
  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Name is required'); return }
    if (trimmed === item.name) { setEditing(false); return }
    onSave(item.id, { name: trimmed })
    setEditing(false)
  }

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      setTimeout(() => setConfirmingDelete(false), 3000)
      return
    }
    onDelete(item.id)
    setConfirmingDelete(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app bg-app/50 group">
      {editing ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit() }}
            className="flex-1 min-w-0 text-xs bg-app border border-brand-500/40 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button onClick={save} disabled={isSaving} className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10" aria-label="Save">
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button onClick={cancelEdit} className="p-1 rounded-md text-muted hover:text-app hover:bg-surface" aria-label="Cancel">
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 min-w-0 text-xs font-medium text-app truncate">{item.name}</span>
          {extra}
          <button onClick={startEdit} className="p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-app hover:bg-surface transition-all" aria-label="Rename">
            <Edit2 size={12} />
          </button>
          <button onClick={handleDeleteClick} disabled={isDeleting}
            className={clsx(
              'p-1 rounded-md transition-all',
              confirmingDelete ? 'text-white bg-red-500 opacity-100' : 'text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10'
            )}
            title={confirmingDelete ? 'Click again to confirm delete' : 'Delete'}
            aria-label="Delete">
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </>
      )}
    </div>
  )
}

// ─── New item form ─────────────────────────────────────────────────────────────

function NewItemForm({ placeholder, onAdd, isAdding, extra }) {
  const [name, setName] = useState('')
  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }
  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-xs bg-app border border-app rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
      />
      {extra}
      <button onClick={submit} disabled={isAdding || !name.trim()}
        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40 whitespace-nowrap">
        {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add
      </button>
    </div>
  )
}

// ─── Main modal ─────────────────────────────────────────────────────────────────

export default function CategoryCollectionModal({ isOpen, onClose }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('categories') // 'categories' | 'collections'
  const [newCollectionCategoryId, setNewCollectionCategoryId] = useState('')

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => categoriesAPI.list().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const { data: collections = [], isLoading: colLoading } = useQuery({
    queryKey: ['collections', 'admin', 'all'],
    queryFn: () => collectionsAPI.list().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['collections'] })
    // Product list rows show category_name / collection_name — refresh those too
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  // ── Category mutations ──────────────────────────────────────────────────────

  const [savingCatId, setSavingCatId] = useState(null)
  const [deletingCatId, setDeletingCatId] = useState(null)

  const createCategory = useMutation({
    mutationFn: (name) => categoriesAPI.create({ name }),
    onSuccess: () => { toast.success('Category created'); invalidateAll() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create category'),
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onMutate: ({ id }) => setSavingCatId(id),
    onSettled: () => setSavingCatId(null),
    onSuccess: () => { toast.success('Category updated'); invalidateAll() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update category'),
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => categoriesAPI.delete(id),
    onMutate: (id) => setDeletingCatId(id),
    onSettled: () => setDeletingCatId(null),
    onSuccess: () => {
      toast.success('Category deleted — products in it were unassigned, not deleted')
      invalidateAll()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to delete category'),
  })

  // ── Collection mutations ────────────────────────────────────────────────────

  const [savingColId, setSavingColId] = useState(null)
  const [deletingColId, setDeletingColId] = useState(null)

  const createCollection = useMutation({
    mutationFn: (name) => collectionsAPI.create({
      name,
      category_id: newCollectionCategoryId ? Number(newCollectionCategoryId) : null,
    }),
    onSuccess: () => { toast.success('Collection created'); setNewCollectionCategoryId(''); invalidateAll() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create collection'),
  })

  const updateCollection = useMutation({
    mutationFn: ({ id, data }) => collectionsAPI.update(id, data),
    onMutate: ({ id }) => setSavingColId(id),
    onSettled: () => setSavingColId(null),
    onSuccess: () => { toast.success('Collection updated'); invalidateAll() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update collection'),
  })

  const deleteCollection = useMutation({
    mutationFn: (id) => collectionsAPI.delete(id),
    onMutate: (id) => setDeletingColId(id),
    onSettled: () => setDeletingColId(null),
    onSuccess: () => {
      toast.success('Collection deleted — products in it were unassigned, not deleted')
      invalidateAll()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to delete collection'),
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories & Collections" size="lg">
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-app -mt-1">
          {[
            { key: 'categories',  label: 'Categories',  icon: <Tag size={13} /> },
            { key: 'collections', label: 'Collections', icon: <Layers size={13} /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
              )}>
              {t.icon}{t.label}
              <span className="text-[10px] opacity-60">
                ({t.key === 'categories' ? categories.length : collections.length})
              </span>
            </button>
          ))}
        </div>

        {/* Categories tab */}
        {tab === 'categories' && (
          <div className="space-y-3">
            <NewItemForm
              placeholder="New category name…"
              onAdd={(name) => createCategory.mutate(name)}
              isAdding={createCategory.isPending}
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {catLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No categories yet.</p>
              ) : (
                categories.map(c => (
                  <EditableRow
                    key={c.id}
                    item={c}
                    isSaving={savingCatId === c.id && updateCategory.isPending}
                    isDeleting={deletingCatId === c.id && deleteCategory.isPending}
                    onSave={(id, data) => updateCategory.mutate({ id, data })}
                    onDelete={(id) => deleteCategory.mutate(id)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Collections tab */}
        {tab === 'collections' && (
          <div className="space-y-3">
            <NewItemForm
              placeholder="New collection name…"
              onAdd={(name) => createCollection.mutate(name)}
              isAdding={createCollection.isPending}
              extra={
                <select value={newCollectionCategoryId} onChange={e => setNewCollectionCategoryId(e.target.value)}
                  className="text-xs bg-app border border-app rounded-md px-2 py-1.5 max-w-[130px]">
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              }
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {colLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
              ) : collections.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No collections yet.</p>
              ) : (
                collections.map(c => (
                  <EditableRow
                    key={c.id}
                    item={c}
                    isSaving={savingColId === c.id && updateCollection.isPending}
                    isDeleting={deletingColId === c.id && deleteCollection.isPending}
                    onSave={(id, data) => updateCollection.mutate({ id, data })}
                    onDelete={(id) => deleteCollection.mutate(id)}
                    extra={c.category_name && (
                      <span className="text-[9px] text-muted bg-surface px-1.5 py-0.5 rounded border border-app whitespace-nowrap">
                        {c.category_name}
                      </span>
                    )}
                  />
                ))
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted flex items-start gap-1.5 pt-1 border-t border-app">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          Deleting a category or collection does not delete its products — they're simply unassigned from it.
        </p>
      </div>
    </Modal>
  )
}