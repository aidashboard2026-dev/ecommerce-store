import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, Calendar, MapPin, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import { customersAPI } from '../../services/api'

const FIELD = ({ label, icon: Icon, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-muted mb-1.5">
      <span className="flex items-center gap-1.5"><Icon size={12} />{label}</span>
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
)

const DEFAULT = {
  first_name: '', last_name: '', email: '', phone: '',
  dob: '', city: '', state: '', country: '', tags: '', notes: '',
}

export default function CustomerFormModal({ open, onClose, customer = null }) {
  const qc = useQueryClient()
  const isEdit = !!customer
  const [form, setForm] = useState(DEFAULT)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      if (customer) {
        setForm({
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          dob: customer.dob || '',
          city: customer.city || '',
          state: customer.state || '',
          country: customer.country || '',
          tags: (customer.tags || []).join(', '),
          notes: customer.notes || '',
        })
      } else {
        setForm(DEFAULT)
      }
      setErrors({})
    }
  }, [open, customer])

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim()) e.last_name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => {
    const tags = form.tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)
    return { ...form, tags, dob: form.dob || null }
  }

  const mutation = useMutation({
    mutationFn: isEdit
      ? (data) => customersAPI.update(customer.id, data)
      : (data) => customersAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['customers'])
      toast.success(isEdit ? 'Customer updated' : 'Customer created')
      onClose()
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Something went wrong'
      toast.error(msg)
    },
  })

  const handleSubmit = () => {
    if (!validate()) return
    mutation.mutate(buildPayload())
  }

  if (!open) return null

  return (
    <Modal title={isEdit ? 'Edit Customer' : 'Add Customer'} onClose={onClose}>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <FIELD label="First Name" icon={User} error={errors.first_name}>
            <input className="input-field" value={form.first_name} onChange={set('first_name')} placeholder="First name" />
          </FIELD>
          <FIELD label="Last Name" icon={User} error={errors.last_name}>
            <input className="input-field" value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
          </FIELD>
        </div>

        <FIELD label="Email" icon={Mail} error={errors.email}>
          <input
            className="input-field"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="customer@example.com"
            disabled={isEdit}
          />
          {isEdit && <p className="text-xs text-muted mt-1">Email cannot be changed.</p>}
        </FIELD>

        <div className="grid grid-cols-2 gap-4">
          <FIELD label="Phone" icon={Phone} error={errors.phone}>
            <input className="input-field" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </FIELD>
          <FIELD label="Date of Birth" icon={Calendar} error={errors.dob}>
            <input className="input-field" type="date" value={form.dob} onChange={set('dob')} />
          </FIELD>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FIELD label="City" icon={MapPin} error={errors.city}>
            <input className="input-field" value={form.city} onChange={set('city')} placeholder="City" />
          </FIELD>
          <FIELD label="State" icon={MapPin} error={errors.state}>
            <input className="input-field" value={form.state} onChange={set('state')} placeholder="State" />
          </FIELD>
          <FIELD label="Country" icon={MapPin} error={errors.country}>
            <input className="input-field" value={form.country} onChange={set('country')} placeholder="Country" />
          </FIELD>
        </div>

        <FIELD label="Tags (comma-separated)" icon={Tag} error={errors.tags}>
          <input className="input-field" value={form.tags} onChange={set('tags')} placeholder="vip, wholesale, returner" />
        </FIELD>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Internal Notes</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Admin notes about this customer..."
          />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-app">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
