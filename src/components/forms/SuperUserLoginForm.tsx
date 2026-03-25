'use client'

import { useState, useEffect } from 'react'
import { LoginForm, User } from '@/types'

interface SuperUserLoginProps {
  onSuccess: (user: User) => void
}

export function SuperUserLoginForm({ onSuccess }: SuperUserLoginProps) {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<LoginForm & { general: string }>>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.backgroundColor = '#F2F2F7'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

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
    try {
      const response = await fetch('/api/auth/superuser-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      if (!response.ok) {
        setErrors({ general: data.error || 'Error al iniciar sesión' })
        return
      }
      if (data.success) {
        onSuccess(data.user)
      } else {
        setErrors({ general: 'Credenciales inválidas. Acceso denegado.' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Error al iniciar sesión. Inténtalo de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 font-poppins screen-enter"
      style={{ backgroundColor: '#F2F2F7' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: '#EEF2FF' }}>
            <svg className="w-8 h-8" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center" style={{ color: '#1C1C1E' }}>myCard Admin</h1>
          <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Acceso superusuario</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#1C1C1E' }}>Iniciar sesión</h2>
          <p className="text-sm mb-5" style={{ color: '#8E8E93' }}>Solo personal autorizado</p>

          {errors.general && (
            <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#FFF1F0', border: '1px solid #FFCDD2' }}>
              <p className="text-sm" style={{ color: '#FF3B30' }}>{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>EMAIL</label>
              <input
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="admin@mycard.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  border: `1.5px solid ${errors.email ? '#FF3B30' : focusedField === 'email' ? '#6366F1' : '#E5E5EA'}`,
                  color: '#1C1C1E',
                  backgroundColor: '#FAFAFA',
                }}
              />
              {errors.email && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>CONTRASEÑA</label>
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
              {errors.password && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.password}</p>}
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
            Todos los accesos quedan registrados.
          </p>
        </div>
      </div>
    </div>
  )
}
