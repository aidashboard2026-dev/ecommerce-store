import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Mail, Phone, Calendar, MapPin, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import { customersAPI } from '../../services/api'

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

  return (
    <Modal isOpen={open} title={isEdit ? 'Edit Customer' : 'Add Customer'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            icon={User}
            error={errors.first_name}
            value={form.first_name}
            onChange={set('first_name')}
            placeholder="First name"
          />
          <Input
            label="Last Name"
            icon={User}
            error={errors.last_name}
            value={form.last_name}
            onChange={set('last_name')}
            placeholder="Last name"
          />
        </div>

        <Input
          label="Email"
          icon={Mail}
          error={errors.email}
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="customer@example.com"
          disabled={isEdit}
          helperText={isEdit ? "Email cannot be changed." : undefined}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone"
            icon={Phone}
            error={errors.phone}
            value={form.phone}
            onChange={set('phone')}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Date of Birth"
            icon={Calendar}
            error={errors.dob}
            type="date"
            value={form.dob}
            onChange={set('dob')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="City"
            icon={MapPin}
            error={errors.city}
            value={form.city}
            onChange={set('city')}
            placeholder="City"
          />
          <Input
            label="State"
            icon={MapPin}
            error={errors.state}
            value={form.state}
            onChange={set('state')}
            placeholder="State"
          />
          <Input
            label="Country"
            icon={MapPin}
            error={errors.country}
            value={form.country}
            onChange={set('country')}
            placeholder="Country"
          />
        </div>

        <Input
          label="Tags (comma-separated)"
          icon={Tag}
          error={errors.tags}
          value={form.tags}
          onChange={set('tags')}
          placeholder="vip, wholesale, returner"
        />

        <div>
          <label className="block text-xs font-semibold text-app mb-1.5">Internal Notes</label>
          <textarea
            className="input-field resize-none focus:ring-brand-500/10"
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Admin notes about this customer..."
          />
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-app">
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
