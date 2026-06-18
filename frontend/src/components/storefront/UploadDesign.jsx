import React, { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { genLocalId, isDuplicateFile } from '../../utils/productUtils'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Client-side only design-file picker for custom product requests. Mirrors
// the drag-and-drop pattern already used by the admin ImageUploadModal, but
// supports multiple files and never calls an API — files stay as in-memory
// previews until the quote request is sent (there's no backend endpoint to
// upload design files to yet).
export default function UploadDesign({ items, onChange }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    const accepted = []
    for (const f of files) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: only JPG, PNG, or WebP allowed`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: must be under ${MAX_FILE_SIZE / (1024 * 1024)} MB`)
        continue
      }
      if (isDuplicateFile(f, items)) continue
      accepted.push({ id: genLocalId(), file: f, previewUrl: URL.createObjectURL(f) })
    }
    if (accepted.length) onChange([...items, ...accepted])
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
        dragging ? 'border-brand-500 bg-brand-500/5' : 'border-app hover:border-brand-400 hover:bg-surface/50'
      }`}
    >
      <Upload size={22} className="mx-auto mb-2 text-muted" />
      <p className="text-sm text-app">
        Drop your design here or <span className="text-brand-500 font-semibold">browse</span>
      </p>
      <p className="text-xs text-muted mt-1">JPG, PNG, WebP · max 5 MB each · multiple files allowed</p>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  )
}
