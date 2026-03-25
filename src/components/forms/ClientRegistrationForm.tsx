'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FinalClientRegistrationForm, User, Business } from '@/types'

interface ClientRegistrationSuccessData {
  success: boolean
  message: string
  user: User
}

interface ClientRegistrationProps {
  token: string
  business: Business
  onSuccess: (data: ClientRegistrationSuccessData) => void
}

export function ClientRegistrationForm({ token, business, onSuccess }: ClientRegistrationProps) {
  const [formData, setFormData] = useState<FinalClientRegistrationForm>({
    first_name: '',
    last_name: '',
    phone: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<FinalClientRegistrationForm>>({})

  const handleInputChange = (field: keyof FinalClientRegistrationForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FinalClientRegistrationForm> = {}
    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es requerido'
    if (!formData.last_name.trim()) newErrors.last_name = 'El apellido es requerido'
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/register-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Phone number already registered') {
          setErrors({ phone: 'Este número ya está registrado' })
        } else if (data.error === 'Invalid or expired token') {
          setErrors({ phone: 'El enlace de registro es inválido o expiró' })
        } else {
          setErrors({ phone: data.error || 'Registro fallido. Intenta de nuevo.' })
        }
        return
      }

      if (data.success) {
        onSuccess({
          success: true,
          message: 'Bienvenido a ' + business.business_name,
          user: data.user
        })
      } else {
        setErrors({ phone: 'Registro fallido. Intenta de nuevo.' })
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ phone: 'Registro fallido. Intenta de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen font-poppins flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: '#F2F2F7' }}
    >
      <div className="w-full max-w-sm screen-enter">
        {/* Business header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto rounded-full overflow-hidden shadow-lg mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#6366F1' }}
          >
            {business.business_image_url ? (
              <Image
                src={business.business_image_url}
                alt={`Logo de ${business.business_name}`}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#1C1C1E' }}>
            {business.business_name}
          </h1>
          <p className="text-sm" style={{ color: '#8E8E93' }}>
            Crea tu cuenta para comenzar
          </p>
        </div>

        {/* Form card */}
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <h2 className="text-lg font-semibold mb-5" style={{ color: '#1C1C1E' }}>
            Registro rápido
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#1C1C1E' }}>
                Nombre
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={handleInputChange('first_name')}
                autoFocus
                placeholder="Tu nombre"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  border: errors.first_name ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1' }}
                onBlur={e => { e.target.style.borderColor = errors.first_name ? '#FF3B30' : '#E5E5EA' }}
              />
              {errors.first_name && (
                <p className="mt-1 text-xs" style={{ color: '#FF3B30' }}>{errors.first_name}</p>
              )}
            </div>

            {/* Last name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#1C1C1E' }}>
                Apellido
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={handleInputChange('last_name')}
                placeholder="Tu apellido"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  border: errors.last_name ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1' }}
                onBlur={e => { e.target.style.borderColor = errors.last_name ? '#FF3B30' : '#E5E5EA' }}
              />
              {errors.last_name && (
                <p className="mt-1 text-xs" style={{ color: '#FF3B30' }}>{errors.last_name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#1C1C1E' }}>
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  border: errors.phone ? '1.5px solid #FF3B30' : '1.5px solid #E5E5EA',
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1' }}
                onBlur={e => { e.target.style.borderColor = errors.phone ? '#FF3B30' : '#E5E5EA' }}
              />
              {errors.phone && (
                <p className="mt-1 text-xs" style={{ color: '#FF3B30' }}>{errors.phone}</p>
              )}
              <p className="mt-1 text-xs" style={{ color: '#8E8E93' }}>
                Para recordatorios de tus citas
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-[14px] font-semibold text-white text-sm transition-opacity active:opacity-80 mt-2"
              style={{ backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1' }}
            >
              {isSubmitting ? 'Creando cuenta...' : 'Comenzar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#8E8E93' }}>
          Tu información solo será utilizada por {business.business_name}
        </p>
      </div>
    </div>
  )
}
