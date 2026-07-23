/**
 * CustomCategoryCollectionModel.jsx
 *
 * Manages ONLY Custom Printing categories (custom_categories table).
 *
 * DOMAIN BOUNDARY — NON-NEGOTIABLE:
 * - This modal MUST NOT import categoriesAPI, collectionsAPI, or subCollectionsAPI.
 * - It MUST NOT show collections or sub-collections — Custom Printing has none.
 * - It uses customCategoriesAPI exclusively (custom_categories table).
 * - Limit messaging follows the business-growth pattern (not "delete one to add").
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Check, X, Loader2, AlertTriangle, Tag, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import Modal from '@/shared/components/ui/Modal'
import { customCategoriesAPI } from '@/shared/services/api'
import useBusinessLimits from '@/shared/hooks/useBusinessLimits'
import { getStructuralLimitMessage } from '@/shared/utils/limitMessages'
import { getApiErrorMessage } from '@/shared/utils/productUtils'

// ─── Editable row ──────────────────────────────────────────────────────────────

function EditableRow({ item, onSave, onDelete, isSaving, isDeleting }) {
  const [editing, setEditing]       = useState(false)
  const [name, setName]             = useState(item.name)
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => { if (!editing) setName(item.name) }, [item.name, editing])
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
          {item.status === 'inactive' && (
            <span className="text-[9px] text-muted bg-surface px-1.5 py-0.5 rounded border border-app whitespace-nowrap">
              Inactive
            </span>
          )}
          <button
            onClick={startEdit}
            className="p-1 rounded-md text-muted hover:text-brand-500 hover:bg-brand-500/10 transition-all cursor-pointer"
            aria-label="Rename"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={clsx(
              'p-1 rounded-md transition-all cursor-pointer',
              confirming
                ? 'text-white bg-red-500 opacity-100'
                : 'text-rose-500 hover:text-white hover:bg-red-500'
            )}
            title={confirming ? 'Click again to confirm delete' : 'Delete this category'}
            aria-label="Delete"
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Add form ──────────────────────────────────────────────────────────────────

function AddCategoryForm({ onAdd, isAdding, disabled, disabledReason }) {
  const [draft, setDraft] = useState('')

  const submit = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onAdd(trimmed, () => setDraft(''))
  }

  const isBtnDisabled = isAdding || disabled || !draft.trim();

  return (
    <div
      className="flex items-center gap-2 w-full"
      title={disabled ? disabledReason : ''}
    >
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !disabled) submit() }}
        placeholder={disabled ? 'Category limit reached' : 'New category name...'}
        disabled={disabled}
        className="flex-1 min-w-0 text-xs bg-app border border-app rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isBtnDisabled}
        className={clsx(
          "inline-flex min-w-[75px] items-center justify-center gap-1 rounded-md border border-brand-600 bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition-all duration-150 whitespace-nowrap",
          !isBtnDisabled && "hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
          isBtnDisabled && "opacity-40 cursor-not-allowed shadow-none"
        )}
      >
        {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add
      </button>
    </div>
  )
}

// ─── Business-growth limit banner ─────────────────────────────────────────────

function LimitReachedBanner({ max }) {
  return (
    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
      <Info size={13} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold mb-0.5">Maximum Categories Reached ({max}/{max})</p>
        <p className="leading-relaxed">{getStructuralLimitMessage('custom_category', max)}</p>
      </div>
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export default function CustomCategoryCollectionModel({ isOpen, onClose }) {
  const qc = useQueryClient()
  const { limits, isLoading: limitsLoading, error: limitsError, refetch: refetchLimits } = useBusinessLimits()

  const dirtyRef = useRef(false)

  useEffect(() => {
    if (isOpen) dirtyRef.current = false
  }, [isOpen])

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['custom-categories', 'admin'],
    queryFn:  () => customCategoriesAPI.listAdmin().then(r => r.data),
    enabled:  isOpen,
    staleTime: 30_000,
  })

  const invalidate = useCallback(() => {
    dirtyRef.current = true
    qc.invalidateQueries({ queryKey: ['custom-categories'] })
  }, [qc])

  const handleClose = useCallback(() => {
    if (dirtyRef.current) {
      qc.invalidateQueries({ queryKey: ['custom-products'] })
      qc.invalidateQueries({ queryKey: ['custom-product'] })
    }
    onClose()
  }, [onClose, qc])

  // ── Mutations ─────────────────────────────────────────────────────────────

  const [savingId,   setSavingId]   = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const createCategory = useMutation({
    mutationFn: (name) => customCategoriesAPI.create({ name, status: 'active' }),
    onSuccess: () => { toast.success('Category created successfully.'); invalidate() },
    onError: e => toast.error(getApiErrorMessage(e, 'Failed to create category')),
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }) => customCategoriesAPI.update(id, data),
    onMutate:  ({ id }) => setSavingId(id),
    onSettled: ()       => setSavingId(null),
    onSuccess: () => { toast.success('Category updated.'); invalidate() },
    onError: e => toast.error(getApiErrorMessage(e, 'Failed to update category')),
  })

  const deleteCategory = useMutation({
    mutationFn: (id) => customCategoriesAPI.delete(id),
    onMutate:  (id) => setDeletingId(id),
    onSettled: ()   => setDeletingId(null),
    onSuccess: () => { toast.success('Category deleted.'); invalidate() },
    onError: e => toast.error(getApiErrorMessage(e, 'Failed to delete category')),
  })

  // ── Derived state ─────────────────────────────────────────────────────────

  const maxCustomCategories = limits?.max_custom_categories ?? null
  const atLimit = maxCustomCategories !== null && categories.length >= maxCustomCategories
  const addDisabled = limitsLoading || !!limitsError || atLimit

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Manage Custom Categories" size="lg">
      <div className="space-y-4">

        {/* Limits loading / error states */}
        {limitsLoading && (
          <div className="flex items-center gap-2 justify-center py-2 text-xs text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading store limits…</span>
          </div>
        )}
        {limitsError && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>Unable to load store limits.</span>
            </div>
            <button
              type="button"
              onClick={() => refetchLimits()}
              className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab header (single tab — Custom Printing has no collections) */}
        <div className="flex gap-1 border-b border-app -mt-1">
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 border-brand-500 text-brand-500 -mb-px">
            <Tag size={13} />
            Categories
            <span className="text-[10px] opacity-60 ml-1">
              ({categories.length}{maxCustomCategories !== null ? `/${maxCustomCategories}` : ''})
            </span>
          </div>
        </div>

        {/* Limit reached banner — business-growth message, not delete-to-add */}
        {atLimit && maxCustomCategories !== null && (
          <LimitReachedBanner max={maxCustomCategories} />
        )}

        {/* Add form */}
        <AddCategoryForm
          onAdd={(name, onSuccess) => createCategory.mutate(name, { onSuccess })}
          isAdding={createCategory.isPending}
          disabled={addDisabled}
          disabledReason={
            atLimit
              ? "Your current store configuration has reached the maximum allowed limit. Please contact the system administrator if you need additional categories or collections."
              : ''
          }
        />

        {/* Category list */}
        <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain pr-1">
          {catLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={18} className="animate-spin text-muted" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-muted text-center py-8 bg-app/20 rounded-lg border border-dashed border-app">
              No custom categories yet. Add one above to get started.
            </p>
          ) : (
            categories.map(c => (
              <EditableRow
                key={c.id}
                item={c}
                isSaving={savingId === c.id && updateCategory.isPending}
                isDeleting={deletingId === c.id && deleteCategory.isPending}
                onSave={(id, data) => updateCategory.mutate({ id, data })}
                onDelete={(id) => deleteCategory.mutate(id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-app">
          <p className="text-[10px] text-muted flex items-start gap-1.5 max-w-md">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
            Deleting a category unassigns all custom products from it — products are not deleted.
          </p>
          <button onClick={handleClose} className="btn-secondary text-xs py-2 px-4 self-end sm:self-auto">
            Done
          </button>
        </div>

      </div>
    </Modal>
  )
}
