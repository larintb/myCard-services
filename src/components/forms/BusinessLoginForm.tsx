'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LoginForm } from '@/types'
import { BusinessAdminUser } from '@/utils/auth'

interface BusinessLoginProps {
  businessName: string
  businessId: string
  businessImageUrl?: string | null
  onSuccess: (user: BusinessAdminUser) => void
}

export function BusinessLoginForm({ businessName, businessId, businessImageUrl, onSuccess }: BusinessLoginProps) {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<LoginForm & { general: string }>>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleInputChange = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {}
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    setErrors({})
    try {
      const response = await fetch('/api/auth/business-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, businessId })
      })
      const data = await response.json()
      if (data.success) {
        onSuccess({ ...data.user, businessId, businessName })
      } else {
        setErrors({ general: data.error || 'Error de inicio de sesión. Inténtalo de nuevo.' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 font-poppins screen-enter"
      style={{ backgroundColor: '#F2F2F7' }}>
      <div className="w-full max-w-sm">

        {/* Business header */}
        <div className="flex flex-col items-center mb-8">
          {businessImageUrl ? (
            <Image
              src={businessImageUrl}
              alt={businessName}
              width={80}
              height={80}
              className="rounded-full object-cover mb-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
            />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: '#6366F1' }}>
              <span className="text-2xl font-bold text-white">
                {businessName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-center" style={{ color: '#1C1C1E' }}>
            {businessName}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Panel de administración</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#1C1C1E' }}>Bienvenido</h2>
          <p className="text-sm mb-5" style={{ color: '#8E8E93' }}>Inicia sesión para continuar</p>

          {errors.general && (
            <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#FFF1F0', border: '1px solid #FFCDD2' }}>
              <p className="text-sm" style={{ color: '#FF3B30' }}>{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  border: `1.5px solid ${errors.email ? '#FF3B30' : focusedField === 'email' ? '#6366F1' : '#E5E5EA'}`,
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  border: `1.5px solid ${errors.password ? '#FF3B30' : focusedField === 'password' ? '#6366F1' : '#E5E5EA'}`,
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
              />
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-[14px] text-sm font-semibold text-white transition-all active:scale-[0.98] mt-2"
              style={{
                backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                  Iniciando sesión...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: '#8E8E93' }}>
            ¿Necesitas ayuda? Contacta soporte.
          </p>
        </div>
      </div>
    </div>
  )
}
