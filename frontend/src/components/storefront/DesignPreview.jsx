import React from 'react'
import { X, FileImage } from 'lucide-react'

export default function DesignPreview({ items, onRemove }) {
  if (!items || items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-app bg-surface group">
          <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
          <button
            onClick={() => onRemove(item.id)}
            aria-label="Remove design file"
            className="absolute top-1 right-1 p-1 rounded-full bg-app/90 hover:bg-app text-app shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1.5 py-0.5 flex items-center gap-1 truncate">
            <FileImage size={9} className="shrink-0" />
            <span className="truncate">{item.file.name}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
