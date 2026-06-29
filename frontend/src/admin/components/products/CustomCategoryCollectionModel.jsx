import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Check, X, Loader2, AlertTriangle, Tag, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from '@/shared/components/ui/Modal'
import { categoriesAPI, collectionsAPI } from '@/shared/services/api'

const isMainCategory = (name) => {
  if (!name) return false;

  const norm = name
    .trim()
    .toLowerCase()
    .replace(/[\s&_-]+/g, "");

  return [
    "oversizedtshirt",
    "graphicprintedtshirt",
    "backprinttshirt",
    "embroiderydesigntshirt",
    "jersey",
    "giftsprinting",
    "magicmugprint",
    "photoframes",
    "metalframes",
    "mousepads",
    "personalgifts",
    "whitemug",
    "sublimationproducts",
    "waterbottles",
    "skinnytumblers",
    "glassware",
    "hatscaps",
    "weddinggreetingcards",
    "pillows",
  ].includes(norm);
};

const isMainCollection = () => false;

// ─── Editable row ─────────────────────────────────────────────────────────────

function EditableRow({ item, onSave, onDelete, isSaving, isDeleting, extra, disabled }) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(item.name)
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef(null)

  // Keep local name in sync if the item is updated from outside
  useEffect(() => { if (!editing) setName(item.name) }, [item.name, editing])

  // Clear the auto-reset timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const startEdit  = () => { setName(item.name); setEditing(true) }
  const cancelEdit = () => { setName(item.name); setEditing(false) }

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) { toast.error('Name is required'); return }
    if (trimmed === item.name) { setEditing(false); return }
    onSave(item.id, { name: trimmed })
    setEditing(false)
  }

  const handleDeleteClick = () => {
    if (!confirming) {
      setConfirming(true)
      timerRef.current = setTimeout(() => setConfirming(false), 3000)
      return
    }
    clearTimeout(timerRef.current)
    setConfirming(false)
    onDelete(item.id)
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
          {!disabled && (
            <>
              <button
                onClick={startEdit}
                className="p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-app hover:bg-surface transition-all"
                aria-label="Rename"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={clsx(
                  'p-1 rounded-md transition-all',
                  confirming
                    ? 'text-white bg-red-500 opacity-100'
                    : 'text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10'
                )}
                title={confirming ? 'Click again to confirm delete' : 'Delete'}
                aria-label="Delete"
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            </>
          )}
          {disabled && (
            <span className="text-[10px] text-muted italic bg-surface px-1.5 py-0.5 rounded border border-app whitespace-nowrap">
              System Fixed
            </span>
          )}
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
      <button
        onClick={submit}
        disabled={isAdding || !name.trim()}
        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40 whitespace-nowrap"
      >
        {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add
      </button>
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export default function CategoryCollectionModal({ isOpen, onClose }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('categories')
  const [newCollectionCategoryId, setNewCollectionCategoryId] = useState('')

  // Track whether any mutation happened so we can batch-invalidate products on close
  const dirtyRef = useRef(false)

  // Reset tab + dirty flag each time modal is opened
  useEffect(() => {
    if (isOpen) {
      setTab('categories')
      dirtyRef.current = false
    }
  }, [isOpen])

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => customCategoriesAPI.list().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

 

  // Only invalidate categories + collections mid-session.
  // Products are refreshed once on close (below) to avoid freezing the
  // list while the modal is still visible.
  const invalidateCatCol = useCallback(() => {
    dirtyRef.current = true
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['collections'] })
  }, [qc])

  const handleClose = useCallback(() => {
    // Batch-refresh products only if something actually changed
    if (dirtyRef.current) {
      qc.invalidateQueries({ queryKey: ['products'] })
    }
    onClose()
  }, [onClose, qc])

  // ── Category mutations ──────────────────────────────────────────────────────

  const [savingCatId,   setSavingCatId]   = useState(null)
  const [deletingCatId, setDeletingCatId] = useState(null)

  const createCategory = useMutation({
    mutationFn: (name) => categoriesAPI.create({ name }),
    onSuccess: () => { toast.success('Category created successfully.'); invalidateCatCol() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create category'),
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onMutate:  ({ id }) => setSavingCatId(id),
    onSettled: ()       => setSavingCatId(null),
    onSuccess: () => { toast.success('Category updated successfully.'); invalidateCatCol() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update category'),
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => categoriesAPI.delete(id),
    onMutate:  (id) => setDeletingCatId(id),
    onSettled: ()   => setDeletingCatId(null),
    onSuccess: () => {
      toast.success('Category deleted successfully.')
      invalidateCatCol()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to delete category'),
  })

  // ── Collection mutations ────────────────────────────────────────────────────

  const [savingColId,   setSavingColId]   = useState(null)
  const [deletingColId, setDeletingColId] = useState(null)

  const createCollection = useMutation({
    mutationFn: (name) => collectionsAPI.create({
      name,
      category_id: newCollectionCategoryId ? Number(newCollectionCategoryId) : null,
    }),
    onSuccess: () => {
      toast.success('Collection created successfully.')
      setNewCollectionCategoryId('')
      invalidateCatCol()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create collection'),
  })

  const updateCollection = useMutation({
    mutationFn: ({ id, data }) => collectionsAPI.update(id, data),
    onMutate:  ({ id }) => setSavingColId(id),
    onSettled: ()       => setSavingColId(null),
    onSuccess: () => { toast.success('Collection updated successfully.'); invalidateCatCol() },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update collection'),
  })

  const deleteCollection = useMutation({
    mutationFn: (id) => collectionsAPI.delete(id),
    onMutate:  (id) => setDeletingColId(id),
    onSettled: ()   => setDeletingColId(null),
    onSuccess: () => {
      toast.success('Collection deleted successfully.')
      invalidateCatCol()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to delete collection'),
  })

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Categories & Collections" size="lg">
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-app -mt-1">
          {[
            { key: 'categories',  label: 'Categories',  icon: <Tag size={13} /> },
            { key: 'collections', label: 'Collections', icon: <Layers size={13} /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted hover:text-app'
              )}
            >
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
              onAdd={(name) => {
                if (isMainCategory(name)) {
                  toast.error('This category is a system-fixed Main Product category and cannot be created.');
                  return;
                }
                createCategory.mutate(name);
              }}
              isAdding={createCategory.isPending}
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain pr-1">
              {catLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No categories yet.</p>
              ) : (
                categories.map(c => (
                  <EditableRow
                    key={c.id}
                    item={c}
                    disabled={isMainCategory(c.name)}
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
              onAdd={(name) => {
                if (isMainCollection(name)) {
                  toast.error('This collection is a system-fixed Main Product collection and cannot be created.');
                  return;
                }
                createCollection.mutate(name);
              }}
              isAdding={createCollection.isPending}
              extra={
                <select
                  value={newCollectionCategoryId}
                  onChange={e => setNewCollectionCategoryId(e.target.value)}
                  className="text-xs bg-app border border-app rounded-md px-2 py-1.5 max-w-[130px]"
                >
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              }
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain pr-1">
              {colLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
              ) : collections.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">No collections yet.</p>
              ) : (
                collections.map(c => (
                  <EditableRow
                    key={c.id}
                    item={c}
                    disabled={isMainCollection(c.name)}
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