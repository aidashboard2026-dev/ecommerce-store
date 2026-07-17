/**
 * src/components/products/QuickCustomCategoryEditModal.jsx
 * Fast single-product custom category editor — avoids opening the
 * full CustomProductForm just to reassign this field.
 *
 * DOMAIN BOUNDARY RULES (NON-NEGOTIABLE):
 * - This module MUST NOT import productsAPI, categoriesAPI, collectionsAPI, or subCollectionsAPI.
 * - It uses customCategoriesAPI and customProductsAPI exclusively.
 */

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import { customProductsAPI, customCategoriesAPI } from '@/shared/services/api'
import { getApiErrorMessage } from '@/shared/utils/productUtils'

export default function QuickCustomCategoryEditModal({ isOpen, onClose, product }) {
  const qc = useQueryClient()
  const [customCategoryId, setCustomCategoryId] = useState('')

  useEffect(() => {
    if (isOpen && product) {
      setCustomCategoryId(product.custom_category_id || '')
    }
  }, [isOpen, product])

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['custom-categories', 'admin'],
    queryFn: () => customCategoriesAPI.listAdmin().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (data) => customProductsAPI.update(product.id, data),
    onSuccess: () => {
      toast.success('Custom product updated successfully.')
      qc.invalidateQueries({ queryKey: ['custom-products'] })
      qc.invalidateQueries({ queryKey: ['custom-product'] })
      onClose()
    },
    onError: e => toast.error(getApiErrorMessage(e, 'Failed to update custom product')),
  })

  const handleSave = () => {
    mutation.mutate({
      custom_category_id: customCategoryId ? Number(customCategoryId) : null,
    })
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Custom Category" size="sm">
      <div className="space-y-4">
        <p className="text-xs text-muted truncate">
          <span className="font-semibold text-app">{product.title}</span>
        </p>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted">Custom Category</label>
          {catLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted">
              <Loader2 size={13} className="animate-spin" />
              <span>Loading custom categories…</span>
            </div>
          ) : (
            <select
              value={customCategoryId}
              onChange={e => setCustomCategoryId(e.target.value)}
              className="w-full text-xs bg-app border border-app rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="">— None —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 text-xs">Cancel</button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending || catLoading}
            className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
