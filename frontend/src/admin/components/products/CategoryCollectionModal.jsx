import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Check, X, Loader2, AlertTriangle, Tag, Layers, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from '@/shared/components/common/Modal'
import { categoriesAPI, collectionsAPI, subCollectionsAPI } from '@/shared/services/api'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'
import useDefaultCatalog from '@/shared/hooks/useDefaultCatalog'
import { getStructuralLimitMessage } from '@/shared/utils/limitMessages'


const isMainCategory = (name, defaults) => {
  if (!name) return false;
  const norm = name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  const defaultList = defaults || ['tshirt', 'tshirts', 'trackpant', 'trackpants', 'jersey', 'jerseys', 'shirt', 'shirts', 'trouser', 'trousers'];
  return defaultList.some(d => {
    const normD = d.trim().toLowerCase().replace(/[\s_-]+/g, '');
    return norm === normD || norm === normD + 's' || (normD === 'tshirt' && (norm === 'tee' || norm === 'tees'));
  });
}

const isMainCollection = (name, defaults) => {
  if (!name) return false;
  const norm = name.trim().toLowerCase().replace(/[\s_\-\'\"]+/g, '');
  const defaultList = defaults || ['men', 'women', 'kids'];
  return defaultList.some(d => {
    const normD = d.trim().toLowerCase().replace(/[\s_\-\'\"]+/g, '');
    return norm === normD || normD.includes(norm) || norm.includes(normD);
  });
}

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
            <button
              disabled
              title="Built-in item. This cannot be modified."
              className="p-1 rounded-md text-muted opacity-30 cursor-not-allowed"
              aria-label="Cannot delete built-in item"
            >
              <Trash2 size={12} />
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── New item form ─────────────────────────────────────────────────────────────

function NewItemForm({ placeholder, onAdd, isAdding, extra, disabled, value, onChange }) {
  const submit = () => {
    if (disabled) return
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
  }

  return (
    <div className="flex items-center gap-2 w-full" title={disabled ? "Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections." : ""}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={disabled ? "Maximum limit reached" : placeholder}
        disabled={disabled}
        className="flex-1 min-w-0 text-xs bg-app border border-app rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {extra}
      <button
        onClick={submit}
        disabled={isAdding || disabled || !value.trim()}
        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
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
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()
  const { catalog, isLoading: catalogLoading, error: catalogError, refetch: refetchCatalog } = useDefaultCatalog()
  const [tab, setTab] = useState('categories')

  const [newCollectionCategoryId, setNewCollectionCategoryId] = useState('')
  const [selectedCollectionId, setSelectedCollectionId] = useState('')
  const [savingSubId, setSavingSubId] = useState(null)
  const [deletingSubId, setDeletingSubId] = useState(null)

  // Draft inputs for unsaved changes confirmation
  const [catDraft, setCatDraft] = useState('')
  const [colDraft, setColDraft] = useState('')
  const [subDraft, setSubDraft] = useState('')

  // Track whether any mutation happened so we can batch-invalidate products on close
  const dirtyRef = useRef(false)

  // Reset tab + dirty flag each time modal is opened
  useEffect(() => {
    if (isOpen) {
      setTab('categories')
      dirtyRef.current = false
      setCatDraft('')
      setColDraft('')
      setSubDraft('')
    }
  }, [isOpen])

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

  // Auto-select first collection when sub-collections tab is opened
  useEffect(() => {
    if (tab === 'sub-collections' && !selectedCollectionId && collections.length > 0) {
      setSelectedCollectionId(String(collections[0].id))
    }
  }, [tab, collections, selectedCollectionId])

  const { data: subCollections = [], isLoading: subLoading } = useQuery({
    queryKey: ['sub-collections', selectedCollectionId],
    queryFn: () => subCollectionsAPI.list(selectedCollectionId).then(r => r.data),
    enabled: isOpen && !!selectedCollectionId,
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

  // Custom Close attempt that guards against unsaved draft changes
  const handleCloseAttempt = useCallback(() => {
    const hasUnsavedChanges = catDraft.trim() !== '' || colDraft.trim() !== '' || subDraft.trim() !== ''
    if (hasUnsavedChanges) {
      if (window.confirm("You have unsaved changes. Do you want to discard them?")) {
        setCatDraft('')
        setColDraft('')
        setSubDraft('')
        handleClose()
      }
    } else {
      handleClose()
    }
  }, [catDraft, colDraft, subDraft, handleClose])

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

  // ── Sub-Collection mutations ────────────────────────────────────────────────

  const createSubCollection = useMutation({
    mutationFn: ({ collectionId, name }) => subCollectionsAPI.create(collectionId, name),
    onSuccess: () => {
      toast.success('Sub-collection created successfully.')
      invalidateCatCol()
      qc.invalidateQueries({ queryKey: ['sub-collections', selectedCollectionId] })
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create sub-collection'),
  })

  const updateSubCollection = useMutation({
    mutationFn: ({ collectionId, oldName, newName }) => subCollectionsAPI.update(collectionId, oldName, newName),
    onMutate: ({ oldName }) => setSavingSubId(oldName),
    onSettled: () => setSavingSubId(null),
    onSuccess: () => {
      toast.success('Sub-collection updated successfully.')
      invalidateCatCol()
      qc.invalidateQueries({ queryKey: ['sub-collections', selectedCollectionId] })
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update sub-collection'),
  })

  const deleteSubCollection = useMutation({
    mutationFn: ({ collectionId, name }) => subCollectionsAPI.delete(collectionId, name),
    onMutate: ({ name }) => setDeletingSubId(name),
    onSettled: () => setDeletingSubId(null),
    onSuccess: () => {
      toast.success('Sub-collection deleted successfully.')
      invalidateCatCol()
      qc.invalidateQueries({ queryKey: ['sub-collections', selectedCollectionId] })
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to delete sub-collection'),
  })

  return (
    <Modal isOpen={isOpen} onClose={handleCloseAttempt} title="Manage Catalog" size="lg">
      <div className="space-y-4">
        {(limitsLoading || catalogLoading) && (
          <div className="flex items-center gap-2 justify-center py-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading store configuration...</span>
          </div>
        )}
        {(limitsError || catalogError) && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Unable to load store limits or catalog definitions.</span>
            </div>
            <button
              type="button"
              onClick={() => { refetchLimits(); refetchCatalog(); }}
              className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-app -mt-1">
          {[
            { key: 'categories',  label: 'Categories',  icon: <Tag size={13} />, count: categories.length },
            { key: 'collections', label: 'Collections', icon: <Layers size={13} />, count: collections.length },
            { key: 'sub-collections', label: 'Sub-Collections', icon: <FolderOpen size={13} />, count: selectedCollectionId ? subCollections.length : 0 },
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
              <span className="text-[10px] opacity-60 ml-1">
                ({t.count})
              </span>
            </button>
          ))}
        </div>

        {/* Categories tab */}
        {tab === 'categories' && (
          <div className="space-y-3">
            <NewItemForm
              value={catDraft}
              onChange={setCatDraft}
              placeholder="New category name…"
              disabled={limitsLoading || catalogLoading || !!limitsError || !!catalogError || (limits && categories.length >= limits.max_categories)}
              onAdd={(name) => {
                if (!limits) return;
                if (categories.length >= limits.max_categories) {
                  toast.error(getStructuralLimitMessage('category', limits.max_categories), { duration: 6000 });
                  return;
                }

                if (isMainCategory(name, catalog?.default_product_categories)) {
                  toast.error('This category name is reserved. Please choose a different name.');
                  return;
                }
                createCategory.mutate(name, {
                  onSuccess: () => setCatDraft('')
                });
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
                    disabled={isMainCategory(c.name, catalog?.protected_product_categories)}
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
              value={colDraft}
              onChange={setColDraft}
              placeholder="New collection name…"
              disabled={limitsLoading || catalogLoading || !!limitsError || !!catalogError || (limits && collections.length >= limits.max_collections)}
              onAdd={(name) => {
                if (!limits) return;
                if (collections.length >= limits.max_collections) {
                  toast.error(getStructuralLimitMessage('collection', limits.max_collections), { duration: 6000 });
                  return;
                }

                if (isMainCollection(name, catalog?.default_collections)) {
                  toast.error('This collection name is reserved. Please choose a different name.');
                  return;
                }
                createCollection.mutate(name, {
                  onSuccess: () => setColDraft('')
                });
              }}
              isAdding={createCollection.isPending}
              extra={
                <select
                  value={newCollectionCategoryId}
                  onChange={e => setNewCollectionCategoryId(e.target.value)}
                  disabled={limitsLoading || catalogLoading || !!limitsError || !!catalogError || (limits && collections.length >= limits.max_collections)}
                  className="text-xs bg-app border border-app rounded-md px-2 py-1.5 max-w-[130px] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isMainCollection(c.name, catalog?.protected_collections)}
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

        {/* Sub-Collections tab */}
        {tab === 'sub-collections' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-muted whitespace-nowrap">Collection:</label>
              <select
                value={selectedCollectionId}
                onChange={e => setSelectedCollectionId(e.target.value)}
                className="flex-1 text-xs bg-app border border-app rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select a collection…</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {selectedCollectionId ? (
              <>
                <NewItemForm
                  value={subDraft}
                  onChange={setSubDraft}
                  placeholder="New sub-collection name…"
                  disabled={limitsLoading || !!limitsError || (limits && subCollections.length >= limits.max_sub_collections)}
                  onAdd={(name) => {
                    if (!limits) return;
                    if (subCollections.length >= limits.max_sub_collections) {
                      toast.error(getStructuralLimitMessage('sub_collection', limits.max_sub_collections), { duration: 6000 });
                      return;
                    }
                    createSubCollection.mutate({ collectionId: selectedCollectionId, name }, {
                      onSuccess: () => setSubDraft('')
                    })
                  }}
                  isAdding={createSubCollection.isPending}
                />
                <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain pr-1">
                  {subLoading ? (
                    <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-muted" /></div>
                  ) : subCollections.length === 0 ? (
                    <p className="text-xs text-muted text-center py-6">No sub-collections yet.</p>
                  ) : (
                    subCollections.map(name => (
                      <EditableRow
                        key={name}
                        item={{ id: name, name }}
                        isSaving={savingSubId === name && updateSubCollection.isPending}
                        isDeleting={deletingSubId === name && deleteSubCollection.isPending}
                        onSave={(id, data) => updateSubCollection.mutate({ collectionId: selectedCollectionId, oldName: id, newName: data.name })}
                        onDelete={(id) => deleteSubCollection.mutate({ collectionId: selectedCollectionId, name: id })}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted text-center py-8 bg-app/20 rounded-lg border border-dashed border-app">
                Select a collection from the dropdown above to manage its sub-collections.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-app">
          <p className="text-[10px] text-muted flex items-start gap-1.5 max-w-md">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            Deleting a category, collection, or sub-collection is only allowed if no products are assigned to it.
          </p>
          <button
            onClick={handleCloseAttempt}
            className="btn-secondary text-xs py-2 px-4 self-end sm:self-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}