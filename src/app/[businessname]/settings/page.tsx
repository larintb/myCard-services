'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddressAutocomplete, AddressDetails } from '@/components/ui/AddressAutocomplete'
import { MapboxMap } from '@/components/ui/MapboxMap'
import { ImageUploader } from '@/components/ui/ImageUploader'
import { BusinessAdminUser, requireBusinessAdminAuth, clearBusinessAdminSession } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface FormErrors {
  business_name?: string
  owner_name?: string
  phone?: string
  address?: string
}

export default function BusinessSettingsPage({ params }: PageProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string>('')
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingBusiness, setLoadingBusiness] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    business_name: '', owner_name: '', phone: '', address: '', business_image_url: ''
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [addressDetails, setAddressDetails] = useState<AddressDetails | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const loadBusinessData = useCallback(async (businessId: string) => {
    try {
      setLoadingBusiness(true)
      const response = await fetch(`/api/businesses/${businessId}`)
      const data = await response.json()
      if (data.success) {
        setFormData({
          business_name: data.business.business_name,
          owner_name: data.business.owner_name,
          phone: data.business.phone,
          address: data.business.address,
          business_image_url: data.business.business_image_url || ''
        })
      }
    } catch (error) {
      console.error('Error loading business data:', error)
    } finally {
      setLoadingBusiness(false)
    }
  }, [])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      setBusinessName(businessNameDecoded)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadBusinessData(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadBusinessData])

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddressSelect = (address: AddressDetails) => {
    setAddressDetails(address)
    setFormData(prev => ({ ...prev, address: address.fullAddress }))
    if (formErrors.address) setFormErrors(prev => ({ ...prev, address: '' }))
  }

  const handleImageSelect = (file: File, previewUrl: string) => {
    setSelectedImage(file)
    setImagePreviewUrl(previewUrl)
  }

  const handleImageRemove = () => {
    setSelectedImage(null)
    setImagePreviewUrl(null)
  }

  const uploadBusinessImage = async (businessId: string): Promise<string | null> => {
    if (!selectedImage) return null
    setUploadingImage(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', selectedImage)
      formDataUpload.append('businessId', businessId)
      const response = await fetch('/api/upload/business-image', { method: 'POST', body: formDataUpload })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to upload image')
      return data.url
    } catch (error) {
      console.error('Image upload error:', error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const validateForm = () => {
    const errors: FormErrors = {}
    if (!formData.business_name.trim()) errors.business_name = 'El nombre del negocio es requerido'
    if (!formData.owner_name.trim()) errors.owner_name = 'El nombre del propietario es requerido'
    if (!formData.phone.trim()) errors.phone = 'El teléfono es requerido'
    if (!formData.address.trim()) errors.address = 'La dirección es requerida'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveBusinessSettings = async () => {
    if (!validateForm() || !user?.businessId) return
    setIsSaving(true)
    try {
      let imageUrl = formData.business_image_url
      if (selectedImage) {
        try {
          const uploadedUrl = await uploadBusinessImage(user.businessId)
          if (uploadedUrl) imageUrl = uploadedUrl
        } catch {
          alert('Error al subir la imagen, pero se guardarán los demás cambios')
        }
      }
      const response = await fetch(`/api/businesses/${user.businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          business_image_url: imageUrl,
          ...(addressDetails && {
            address_details: {
              place_id: addressDetails.placeId,
              latitude: addressDetails.latitude,
              longitude: addressDetails.longitude,
              city: addressDetails.city,
              state: addressDetails.state,
              country: addressDetails.country,
              postal_code: addressDetails.postalCode
            }
          })
        })
      })
      const data = await response.json()
      if (data.success) {
        alert('¡Configuraciones guardadas!')
        setSelectedImage(null)
        setImagePreviewUrl(null)
        await loadBusinessData(user.businessId)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error saving business settings:', error)
      alert('Error al guardar configuraciones')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    clearBusinessAdminSession()
    router.push(`/${businessName}/login`)
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
      <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">

        {/* Header */}
        <h1 className="text-xl font-bold mb-5" style={{ color: '#1C1C1E' }}>Ajustes</h1>

        {loadingBusiness ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Información del negocio */}
            <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: '#8E8E93' }}>INFORMACIÓN DEL NEGOCIO</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>NOMBRE DEL NEGOCIO</label>
                  <input
                    value={formData.business_name}
                    onChange={handleInputChange('business_name')}
                    onFocus={() => setFocusedField('business_name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Nombre del negocio"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={inputStyle('business_name', formErrors.business_name)}
                    required
                  />
                  {formErrors.business_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.business_name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>PROPIETARIO</label>
                  <input
                    value={formData.owner_name}
                    onChange={handleInputChange('owner_name')}
                    onFocus={() => setFocusedField('owner_name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Nombre del propietario"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={inputStyle('owner_name', formErrors.owner_name)}
                    required
                  />
                  {formErrors.owner_name && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.owner_name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>TELÉFONO</label>
                  <input
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="+52 55 1234 5678"
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                    style={inputStyle('phone', formErrors.phone)}
                    required
                  />
                  {formErrors.phone && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Foto del negocio */}
            <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: '#8E8E93' }}>FOTO DEL NEGOCIO</p>
              <ImageUploader
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                currentImageUrl={imagePreviewUrl || formData.business_image_url || undefined}
                disabled={isSaving || uploadingImage}
                className="w-full"
              />
              <p className="mt-2 text-xs" style={{ color: '#8E8E93' }}>
                Recomendado: 800×800px, máximo 5MB.
              </p>
            </div>

            {/* Dirección */}
            <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-semibold mb-4" style={{ color: '#8E8E93' }}>DIRECCIÓN</p>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Busca la dirección de tu negocio..."
                initialValue={formData.address}
                disabled={isSaving}
                className="w-full"
              />
              {formErrors.address && <p className="text-xs mt-1" style={{ color: '#FF3B30' }}>{formErrors.address}</p>}
              {addressDetails?.fullAddress && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: '#F0FFF4' }}>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#34C759' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium" style={{ color: '#15803D' }}>Dirección seleccionada</p>
                    <p className="text-xs mt-0.5" style={{ color: '#1C1C1E' }}>{addressDetails.fullAddress}</p>
                  </div>
                </div>
              )}

              {/* Map preview */}
              {formData.address && (
                <div className="mt-4 rounded-2xl overflow-hidden" style={{ height: 180 }}>
                  <MapboxMap
                    key={`${formData.address}-${formData.business_name}`}
                    address={formData.address}
                    businessName={formData.business_name || 'Tu Negocio'}
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>

            {/* Secondary links */}
            <div className="bg-white rounded-2xl mb-4 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <Link href={`/${businessName}/hours`}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid #F2F2F7' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                    <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Horarios de atención</span>
                </div>
                <svg className="w-4 h-4" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href={`/${businessName}/reports`}
                className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F0FFF4' }}>
                    <svg className="w-4 h-4" style={{ color: '#34C759' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#1C1C1E' }}>Reportes</span>
                </div>
                <svg className="w-4 h-4" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Save button */}
            <button
              onClick={saveBusinessSettings}
              disabled={isSaving || uploadingImage}
              className="w-full py-3.5 rounded-[14px] text-sm font-semibold text-white mb-4"
              style={{ backgroundColor: (isSaving || uploadingImage) ? '#A5B4FC' : '#6366F1' }}
            >
              {uploadingImage ? 'Subiendo imagen...' : isSaving ? 'Guardando...' : 'Guardar ajustes'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-3.5 rounded-[14px] text-sm font-semibold"
              style={{ color: '#FF3B30', backgroundColor: '#FFF1F0', border: '1px solid #FFCDD2' }}
            >
              Cerrar sesión
            </button>
          </>
        )}
      </div>
    </div>
  )
}
