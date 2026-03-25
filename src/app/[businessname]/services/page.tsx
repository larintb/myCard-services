'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessAdminUser, requireBusinessAdminAuth } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active: boolean
}

interface ServiceFormErrors {
  name?: string
  price?: string
  duration_minutes?: string
}

export default function ServicesPage({ params }: PageProps) {
  const router = useRouter()
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', price: '', duration_minutes: '' })
  const [formErrors, setFormErrors] = useState<ServiceFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const loadServices = useCallback(async (businessId: string) => {
    try {
      setLoadingServices(true)
      const response = await fetch(`/api/businesses/${businessId}/services`)
      const data = await response.json()
      if (data.success) setServices(data.services)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoadingServices(false)
    }
  }, [])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadServices(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadServices])

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (formErrors[field as keyof ServiceFormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const errors: ServiceFormErrors = {}
    if (!formData.name.trim()) errors.name = 'El nombre es requerido'
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Ingresa un precio válido'
    if (!formData.duration_minutes || parseInt(formData.duration_minutes) <= 0) errors.duration_minutes = 'Ingresa una duración válida'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !user?.businessId) return
    setIsSubmitting(true)
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        business_id: user.businessId
      }
      const url = editingService
        ? `/api/businesses/${user.businessId}/services/${editingService.id}`
        : `/api/businesses/${user.businessId}/services`
      const response = await fetch(url, {
        method: editingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      })
      const data = await response.json()
      if (data.success) {
        await loadServices(user.businessId)
        resetForm()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Error al guardar servicio')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', duration_minutes: '' })
    setFormErrors({})
    setShowCreateForm(false)
    setEditingService(null)
  }

  const startEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString()
    })
    setShowCreateForm(true)
  }

  const deleteService = async (serviceId: string) => {
    if (!confirm('¿Eliminar este servicio?') || !user?.businessId) return
    try {
      const response = await fetch(`/api/businesses/${user.businessId}/services/${serviceId}`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        await loadServices(user.businessId)
      } else {
        alert('Error al eliminar: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Error al eliminar servicio')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  const inputStyle = (field: string, error?: string): React.CSSProperties => ({
    border: `1.5px solid ${error ? '#FF3B30' : focusedField === field ? '#6366F1' : '#E5E5EA'}`,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  })

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>Servicios</h1>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: '#6366F1' }}
            >
              +
            </button>
          )}
        </div>

        {/* Create/Edit form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #6366F1' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: '#1C1C1E' }}>
                {editingService ? 'Editar servicio' : 'Nuevo servicio'}
              </h2>
              <button onClick={resetForm} className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#F2F2F7' }}>
                <svg className="w-3.5 h-3.5" style={{ color: '#8E8E93' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>NOMBRE</label>
                <input
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Corte de cabello"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                  style={inputStyle('name', formErrors.name)}
                  required
                />
                {formErrors.name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>PRECIO ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange('price')}
                    onFocus={() => setFocusedField('price')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="45.00"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={inputStyle('price', formErrors.price)}
                    required
                  />
                  {formErrors.price && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.price}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>DURACIÓN (min)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={handleInputChange('duration_minutes')}
                    onFocus={() => setFocusedField('duration_minutes')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="60"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={inputStyle('duration_minutes', formErrors.duration_minutes)}
                    required
                  />
                  {formErrors.duration_minutes && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.duration_minutes}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>DESCRIPCIÓN (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Describe el servicio..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none resize-none"
                  style={inputStyle('description')}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 rounded-[14px] text-sm font-semibold"
                  style={{ color: '#8E8E93', backgroundColor: '#F2F2F7' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-[14px] text-sm font-semibold text-white"
                  style={{ backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1' }}
                >
                  {isSubmitting ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services list */}
        {loadingServices ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="h-4 w-28 rounded mb-2" style={{ backgroundColor: '#F2F2F7' }} />
                <div className="h-3 w-20 rounded" style={{ backgroundColor: '#F2F2F7' }} />
              </div>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="bg-white rounded-2xl p-4"
                style={{
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  borderLeft: editingService?.id === service.id ? '4px solid #6366F1' : '4px solid transparent',
                }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>{service.name}</p>
                    {service.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#8E8E93' }}>{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
                        {service.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <p className="text-base font-bold" style={{ color: '#1C1C1E' }}>${service.price}</p>
                    <button
                      onClick={() => startEdit(service)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#FFF1F0', color: '#FF3B30' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#F2F2F7' }}>
              <svg className="w-7 h-7" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin servicios</p>
            <p className="text-xs mt-1 mb-4" style={{ color: '#C7C7CC' }}>Crea tu primer servicio para empezar</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 rounded-[14px] text-sm font-semibold text-white"
              style={{ backgroundColor: '#6366F1' }}
            >
              + Crear servicio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
