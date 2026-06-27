/**
 * src/components/products/QuickCategoryEditModal.jsx
 * Fast single-product category/collection editor — avoids opening the
 * full InlineProductForm just to reassign these two fields.
 */

import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/shared/components/ui/Modal'
import { productsAPI as productsApi, categoriesAPI, collectionsAPI } from '@/shared/services/api'

function getNormalizedCollectionName(name) {
  if (!name) return null;
  const val = name.trim().toLowerCase().replace(/[\s_\-'\"]+/g, '');
  if (val.includes('women') || val.includes('female') || val.includes('girl') || val.includes('lady') || val.includes('ladies')) {
    return 'Women';
  }
  if (val.includes('men') || val.includes('male') || val.includes('boy')) {
    return 'Men';
  }
  if (val.includes('kid') || val.includes('child')) {
    return 'Kids';
  }
  return null;
}

export default function QuickCategoryEditModal({ isOpen, onClose, product }) {
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [subCollection, setSubCollection] = useState('')

  useEffect(() => {
    if (isOpen && product) {
      setCategoryId(product.category_id || '')
      setCollectionId(product.collection_id || '')
      setSubCollection(product.sub_collection || '')
    }
  }, [isOpen, product])

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'admin'],
    queryFn: () => categoriesAPI.list().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', 'admin'],
    queryFn: () => collectionsAPI.list().then(r => r.data),
    enabled: isOpen,
    staleTime: 30_000,
  })

  const filteredCollections = React.useMemo(() => {
    if (!categoryId) return []
    const selectedCat = categories.find(c => String(c.id) === String(categoryId));
    const isMainProduct = selectedCat && ["T-Shirt", "Track Pant", "Jersey", "Shirt", "Trouser"].includes(selectedCat.name);
    if (isMainProduct) {
      return collections.filter(c => {
        const norm = getNormalizedCollectionName(c.name);
        return ["Men", "Women", "Kids"].includes(norm);
      });
    }
    return collections.filter(c => String(c.category_id) === String(categoryId));
  }, [collections, categoryId, categories]);

  const mutation = useMutation({
    mutationFn: (data) => productsApi.update(product.id, data),
    onSuccess: () => {
      toast.success('Product updated')
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update product'),
  })

  const handleCategoryChange = (e) => {
    setCategoryId(e.target.value)
    setCollectionId('') // collection list depends on category — clear stale selection
  }

  const handleSave = () => {
    const selectedCat = categories.find(c => String(c.id) === String(categoryId));
    const isMainProduct = selectedCat && ["T-Shirt", "Track Pant", "Jersey", "Shirt", "Trouser"].includes(selectedCat.name);
    if (isMainProduct) {
      if (!collectionId) {
        toast.error("Collection is required for Main Products.");
        return;
      }
      const selectedCol = collections.find(c => String(c.id) === String(collectionId));
      const normCol = selectedCol ? getNormalizedCollectionName(selectedCol.name) : null;
      if (!selectedCol || !["Men", "Women", "Kids"].includes(normCol)) {
        toast.error("Invalid collection. Collection must be Men, Women, or Kids.");
        return;
      }
    }

    mutation.mutate({
      category_id: categoryId ? Number(categoryId) : null,
      collection_id: collectionId ? Number(collectionId) : null,
      sub_collection: subCollection ? subCollection.trim() : null,
    })
  }

  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Category & Collection" size="sm">
      <div className="space-y-4">
        <p className="text-xs text-muted truncate">
          <span className="font-semibold text-app">{product.title}</span>
        </p>
 
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted">Category</label>
          <select value={categoryId} onChange={handleCategoryChange}
            className="w-full text-xs bg-app border border-app rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            <option value="">— None —</option>
            {categories.filter(c => ["T-Shirt", "Track Pant", "Jersey", "Shirt", "Trouser"].includes(c.name)).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted">Collection</label>
          <select value={collectionId} onChange={e => setCollectionId(e.target.value)}
            className="w-full text-xs bg-app border border-app rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            <option value="">— None —</option>
            {filteredCollections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted">Sub-Collection</label>
          <input type="text" value={subCollection} onChange={e => setSubCollection(e.target.value)}
            className="w-full text-xs bg-app border border-app rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            placeholder="e.g. Essentials, Casual" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 btn-secondary py-2 text-xs">Cancel</button>
          <button onClick={handleSave} disabled={mutation.isPending}
            className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-2 disabled:opacity-50">
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}