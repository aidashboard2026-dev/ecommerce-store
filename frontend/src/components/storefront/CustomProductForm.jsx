import React, { useState } from 'react'
import clsx from 'clsx'
import UploadDesign from './UploadDesign'
import DesignPreview from './DesignPreview'
import QuoteRequest from './QuoteRequest'
import { revokeObjectURLs } from '../../utils/productUtils'

function OptionChips({ title, options, value, onChange }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={clsx(
              'px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors',
              value === opt
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-app text-app hover:border-brand-500'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CustomProductForm({ product }) {
  const [size, setSize] = useState(product?.size || '')
  const [color, setColor] = useState('')
  const [style, setStyle] = useState('')
  const [placement, setPlacement] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [designFiles, setDesignFiles] = useState([])

  const handleDesignChange = (next) => setDesignFiles(next)
  const handleDesignRemove = (id) => {
    const removed = designFiles.find((f) => f.id === id)
    if (removed) revokeObjectURLs([removed])
    setDesignFiles(designFiles.filter((f) => f.id !== id))
  }

  const summaryLines = [
    `Product: ${product.title}`,
    style && `Style: ${style}`,
    size && `Size: ${size}`,
    color && `Color: ${color}`,
    placement && `Placement: ${placement}`,
    `Quantity: ${quantity}`,
    notes && `Notes: ${notes}`,
    designFiles.length > 0 && `Design files: ${designFiles.length} attached (will be shared separately)`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-app border border-app rounded-2xl p-5 sm:p-6 flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h2 className="font-display font-bold text-lg text-app">{product.title}</h2>
            <p className="text-sm text-muted mt-0.5">{product.description}</p>
          </div>
        </div>

        {false && (
          <OptionChips title="Cup Style" options={productType.styles} value={style} onChange={setStyle} />
        )}

        {false && (
          <OptionChips title="Size" options={productType.sizes} value={size} onChange={setSize} />
        )}

        {false && (
          <OptionChips title="Color" options={productType.colors} value={color} onChange={setColor} />
        )}

        {false && (
          <OptionChips title="Design Placement" options={productType.placements} value={placement} onChange={setPlacement} />
        )}

        {/* Quantity */}
        <div className="flex items-center gap-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-app">Quantity</h4>
          <div className="flex items-center border border-app rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-1.5 text-app hover:bg-surface"
            >
              −
            </button>
            <span className="px-4 py-1.5 text-sm font-semibold text-app">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-1.5 text-app hover:bg-surface"
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-2">Notes / Instructions</h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your design, branding, deadline, or any special requirements…"
            rows={4}
            className="w-full bg-surface border border-app rounded-xl p-4 text-sm text-app focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-muted resize-none"
          />
        </div>

        {/* Design upload */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app mb-2">Design Upload</h4>
          <UploadDesign items={designFiles} onChange={handleDesignChange} />
          <div className="mt-3">
            <DesignPreview items={designFiles} onRemove={handleDesignRemove} />
          </div>
        </div>
      </div>

      <QuoteRequest summaryLines={summaryLines} />
    </div>
  )
}
