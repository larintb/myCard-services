'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MapboxMapEditor } from '@/components/ui/MapboxMapEditor'
import { AddressAutocomplete, AddressDetails } from '@/components/ui/AddressAutocomplete'
import { ImageUploader } from '@/components/ui/ImageUploader'
import { generateBusinessSlug } from '@/utils/slug'
import { BusinessAdminRegistrationForm, User, Business } from '@/types'

const TOTAL_STEPS = 8


interface BusinessRegistrationSuccessData {
  success: boolean
  message: string
  user: User
  business: Business
}

interface BusinessRegistrationProps {
  token: string
  onSuccess: (data: BusinessRegistrationSuccessData) => void
}



export function BusinessRegistrationForm({ token, onSuccess }: BusinessRegistrationProps) {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)

  const [formData, setFormData] = useState<BusinessAdminRegistrationForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    business_name: '',
    owner_name: '',
    business_phone: '',
    address: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')


  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    document.body.style.backgroundColor = '#F2F2F7'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

  // Pre-fill owner_name when reaching step 5
  useEffect(() => {
    if (step === 5 && !formData.owner_name.trim()) {
      setFormData(prev => ({
        ...prev,
        owner_name: `${prev.first_name} ${prev.last_name}`.trim()
      }))
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddressSelect = (details: AddressDetails) => {
    setFormData(prev => ({ ...prev, address: details.fullAddress }))
    setAddressDetails(details)
    if (errors.address) setErrors(prev => ({ ...prev, address: '' }))
  }

  const goTo = (newStep: number) => {
    setDirection(newStep > step ? 'forward' : 'back')
    setAnimKey(k => k + 1)
    setErrors({})
    setStep(newStep)
  }

  const validateStep = (): boolean => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!formData.first_name.trim()) e.first_name = 'El nombre es requerido'
      if (!formData.last_name.trim()) e.last_name = 'El apellido es requerido'
    }
    if (step === 2) {
      if (!formData.email.trim()) e.email = 'El email es requerido'
      else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email no válido'
      if (!formData.phone.trim()) e.phone = 'El teléfono es requerido'
    }
    if (step === 3) {
      if (!formData.password) e.password = 'La contraseña es requerida'
      else if (formData.password.length < 6) e.password = 'Mínimo 6 caracteres'
      if (!confirmPassword) e.confirmPassword = 'Confirma tu contraseña'
      else if (formData.password !== confirmPassword) e.confirmPassword = 'No coinciden'
    }
    if (step === 4) {
      if (!formData.business_name.trim()) e.business_name = 'El nombre es requerido'
      else if (/[*&%^;[\]\\|<>{}]/.test(formData.business_name)) e.business_name = 'No se permiten los caracteres * & % ^ ; [ ] | < > { }'
      else if (formData.business_name.trim().length < 3) e.business_name = 'Mínimo 3 caracteres'
    }
    if (step === 5) {
      if (!formData.owner_name.trim()) e.owner_name = 'El nombre es requerido'
      if (!formData.business_phone.trim()) e.business_phone = 'El teléfono es requerido'
    }
    if (step === 6) {
      if (!formData.address.trim()) e.address = 'Selecciona una dirección de la lista'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep()) goTo(step + 1) }
  const back = () => goTo(step - 1)

  const uploadBusinessImage = async (businessId: string): Promise<string | null> => {
    if (!selectedImage) return null
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedImage)
      fd.append('businessId', businessId)
      const response = await fetch('/api/upload/business-image', { method: 'POST', body: fd })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      return data.url
    } catch (err) {
      console.error('Image upload error:', err)
      throw err
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          business_name: formData.business_name,
          owner_name: formData.owner_name,
          business_phone: formData.business_phone,
          address: formData.address,
          ...(addressDetails && {
            address_details: {
              place_id: addressDetails.placeId,
              latitude: addressDetails.latitude,
              longitude: addressDetails.longitude,
              city: addressDetails.city,
              state: addressDetails.state,
              country: addressDetails.country,
              postal_code: addressDetails.postalCode,
            }
          })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Email already exists') {
          setErrors({ general: 'Este email ya está registrado' })
        } else {
          setErrors({ general: data.error || 'Error al registrar. Inténtalo de nuevo.' })
        }
        return
      }

      if (data.success) {
        let imageUrl = null
        if (selectedImage) {
          try {
            imageUrl = await uploadBusinessImage(data.business.id)
            if (imageUrl) {
              await fetch(`/api/businesses/${data.business.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  business_name: data.business.business_name,
                  owner_name: data.business.owner_name,
                  business_phone: data.business.phone,
                  address: data.business.address,
                  business_image_url: imageUrl
                })
              })
            }
          } catch {
            // Continue even if image upload fails
          }
        }
        onSuccess({
          success: true,
          message: 'Registro exitoso',
          user: data.user,
          business: { ...data.business, business_image_url: imageUrl || data.business.business_image_url }
        })
      }
    } catch (err) {
      console.error('Registration error:', err)
      setErrors({ general: 'Error al registrar. Inténtalo de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle = (id: string, error?: string): React.CSSProperties => ({
    border: `1.5px solid ${error ? '#FF3B30' : focusedField === id ? '#6366F1' : '#E5E5EA'}`,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  })

  const slug = generateBusinessSlug(formData.business_name)

  // ── Step content ────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (step) {

      // Step 1 — Nombre
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>¿Cómo te llamas?</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Tu nombre de contacto personal</p>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>NOMBRE</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={e => { setFormData(p => ({ ...p, first_name: e.target.value })); if (errors.first_name) setErrors(p => ({ ...p, first_name: '' })) }}
                  onFocus={() => setFocusedField('first_name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ana"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('first_name', errors.first_name)}
                />
                {errors.first_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.first_name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>APELLIDO</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={e => { setFormData(p => ({ ...p, last_name: e.target.value })); if (errors.last_name) setErrors(p => ({ ...p, last_name: '' })) }}
                  onFocus={() => setFocusedField('last_name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="García"
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('last_name', errors.last_name)}
                />
                {errors.last_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.last_name}</p>}
              </div>
            </div>
          </div>
        )

      // Step 2 — Contacto
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Tu contacto</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Para iniciar sesión y notificaciones</p>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>EMAIL</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => { setFormData(p => ({ ...p, email: e.target.value })); if (errors.email) setErrors(p => ({ ...p, email: '' })) }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="ana@email.com"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('email', errors.email)}
                />
                {errors.email && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>TELÉFONO</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => { setFormData(p => ({ ...p, phone: e.target.value })); if (errors.phone) setErrors(p => ({ ...p, phone: '' })) }}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('phone', errors.phone)}
                />
                {errors.phone && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.phone}</p>}
              </div>
            </div>
          </div>
        )

      // Step 3 — Contraseña
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Crea tu contraseña</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Mínimo 6 caracteres</p>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>CONTRASEÑA</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => { setFormData(p => ({ ...p, password: e.target.value })); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('password', errors.password)}
                />
                {errors.password && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.password}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>CONFIRMAR CONTRASEÑA</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' })) }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('confirmPassword', errors.confirmPassword)}
                />
                {errors.confirmPassword && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )

      // Step 4 — Nombre del negocio + URL preview
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Nombre del negocio</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Así aparecerás ante tus clientes</p>
            </div>
            <div className="pt-2">
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>NOMBRE</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={e => {
                  const val = e.target.value
                  setFormData(p => ({ ...p, business_name: val }))
                  if (/[*&%^;[\]\\|<>{}]/.test(val)) {
                    setErrors(p => ({ ...p, business_name: 'No se permiten los caracteres * & % ^ ; [ ] | < > { }' }))
                  } else if (val.trim().length > 0 && val.trim().length < 3) {
                    setErrors(p => ({ ...p, business_name: 'Mínimo 3 caracteres' }))
                  } else {
                    setErrors(p => ({ ...p, business_name: '' }))
                  }
                }}
                onFocus={() => setFocusedField('business_name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Peluquería María"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                style={inputStyle('business_name', errors.business_name)}
              />
              {errors.business_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.business_name}</p>}
            </div>

            {/* URL preview */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: slug ? '#EEF2FF' : '#F2F2F7' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#8E8E93' }}>TU ENLACE</p>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-mono" style={{ color: '#8E8E93' }}>
                  {origin || 'mycard.com'}/
                </span>
                <span
                  className="text-sm font-bold font-mono px-2 py-0.5 rounded-lg"
                  style={{
                    backgroundColor: slug ? '#6366F1' : '#E5E5EA',
                    color: slug ? '#FFFFFF' : '#C7C7CC',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {slug || 'tu-negocio'}
                </span>
                <span className="text-xs font-mono" style={{ color: '#8E8E93' }}>/dashboard</span>
              </div>
              {slug && (
                <p className="text-xs mt-2" style={{ color: '#6366F1' }}>
                  Este será el link a tu panel de control
                </p>
              )}
            </div>
          </div>
        )

      // Step 5 — Propietario + Teléfono negocio
      case 5:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Sobre el negocio</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Datos de contacto del negocio</p>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>
                  NOMBRE DEL PROPIETARIO
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={e => { setFormData(p => ({ ...p, owner_name: e.target.value })); if (errors.owner_name) setErrors(p => ({ ...p, owner_name: '' })) }}
                  onFocus={() => setFocusedField('owner_name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Ana García"
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('owner_name', errors.owner_name)}
                />
                {errors.owner_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.owner_name}</p>}
                <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>Pre-llenado con tu nombre — edítalo si es diferente</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>TELÉFONO DEL NEGOCIO</label>
                <input
                  type="tel"
                  value={formData.business_phone}
                  onChange={e => { setFormData(p => ({ ...p, business_phone: e.target.value })); if (errors.business_phone) setErrors(p => ({ ...p, business_phone: '' })) }}
                  onFocus={() => setFocusedField('business_phone')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="+1 (555) 111-2222"
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all"
                  style={inputStyle('business_phone', errors.business_phone)}
                />
                {errors.business_phone && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.business_phone}</p>}
              </div>
            </div>
          </div>
        )

      // Step 6 — Dirección + Mapa
      case 6:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Ubicación</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>¿Dónde está tu negocio?</p>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>DIRECCIÓN</label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Busca tu dirección..."
                initialValue={formData.address}
                className={errors.address ? 'ring-1 ring-red-400 rounded-xl' : ''}
              />
              {errors.address && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{errors.address}</p>}
            </div>

            {addressDetails?.longitude && addressDetails?.latitude && (
              <div style={{ height: 200 }}>
                <MapboxMapEditor
                  coords={[addressDetails.longitude, addressDetails.latitude]}
                  onCoordsChange={(lng, lat) => setAddressDetails(prev => prev ? { ...prev, longitude: lng, latitude: lat } : prev)}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
        )

      // Step 7 — Logo
      case 7:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Logo del negocio</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Opcional — puedes agregarlo después</p>
            </div>
            <div className="pt-2">
              <ImageUploader
                onImageSelect={(file, url) => { setSelectedImage(file); setImagePreviewUrl(url) }}
                onImageRemove={() => { setSelectedImage(null); setImagePreviewUrl(null) }}
                currentImageUrl={imagePreviewUrl || undefined}
                disabled={isSubmitting}
                className="w-full"
              />
              <p className="text-xs mt-2" style={{ color: '#8E8E93' }}>Recomendado: 800×800px, máx 5MB</p>
            </div>
          </div>
        )

      // Step 8 — Resumen
      case 8: {
        const businessInitial = formData.business_name.charAt(0).toUpperCase()
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#1C1C1E' }}>Todo listo</h2>
              <p className="text-sm mt-1" style={{ color: '#8E8E93' }}>Revisa tu información antes de crear la cuenta</p>
            </div>

            {errors.general && (
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FFF1F0', border: '1px solid #FFCDD2' }}>
                <p className="text-sm" style={{ color: '#FF3B30' }}>{errors.general}</p>
              </div>
            )}

            {/* Summary card */}
            <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              {/* Business identity */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: '#6366F1' }}>
                  {imagePreviewUrl ? (
                    <Image src={imagePreviewUrl} alt="logo" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">{businessInitial || '?'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold truncate" style={{ color: '#1C1C1E' }}>{formData.business_name}</p>
                  <p className="text-xs truncate font-mono" style={{ color: '#6366F1' }}>
                    /{slug}/dashboard
                  </p>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: '#F2F2F7' }} />

              {/* Info rows */}
              {[
                { label: 'Nombre', value: `${formData.first_name} ${formData.last_name}` },
                { label: 'Email', value: formData.email },
                { label: 'Teléfono', value: formData.phone },
                { label: 'Propietario', value: formData.owner_name },
                { label: 'Tel. negocio', value: formData.business_phone },
                { label: 'Dirección', value: formData.address, truncate: true },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold flex-shrink-0" style={{ color: '#8E8E93' }}>{row.label}</p>
                  <p className={`text-xs text-right font-medium ${row.truncate ? 'truncate' : ''}`}
                    style={{ color: '#1C1C1E', maxWidth: '65%' }}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  const isLastStep = step === TOTAL_STEPS
  const isLoading = isSubmitting || uploadingImage

  return (
    <div className="min-h-screen font-poppins" style={{ backgroundColor: '#F2F2F7' }}>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 3, backgroundColor: '#E5E5EA' }}>
        <div style={{
          height: '100%',
          width: `${(step / TOTAL_STEPS) * 100}%`,
          backgroundColor: '#6366F1',
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div className="px-5 pt-12 pb-12 max-w-sm mx-auto">

        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={back}
            className="flex items-center gap-1 text-sm font-medium"
            style={{
              color: step > 1 ? '#6366F1' : 'transparent',
              pointerEvents: step > 1 ? 'auto' : 'none',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>

          <p className="text-xs font-semibold" style={{ color: '#C7C7CC' }}>
            {step} / {TOTAL_STEPS}
          </p>

          {/* Step dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i + 1 === step ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i + 1 <= step ? '#6366F1' : '#E5E5EA',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Animated step content + submit wrapped in form for Enter key support */}
        <form
          onSubmit={e => { e.preventDefault(); if (isLastStep) { handleSubmit(); } else { next(); } }}
        >
          <div
            key={animKey}
            className={direction === 'forward' ? 'step-forward' : 'step-back'}
          >
            {renderStepContent()}
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-[14px] text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isLoading ? '#A5B4FC' : '#6366F1',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                  {uploadingImage ? 'Subiendo logo...' : 'Creando cuenta...'}
                </span>
              ) : isLastStep ? 'Crear cuenta' : 'Siguiente'}
            </button>

            {/* Skip on logo step */}
            {step === 7 && !selectedImage && (
              <button
                type="button"
                onClick={next}
                className="w-full mt-3 py-3 text-sm font-semibold"
                style={{ color: '#8E8E93' }}
              >
                Omitir por ahora
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
