'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessLoginForm } from '@/components/forms/BusinessLoginForm'
import { setBusinessAdminSession, BusinessAdminUser } from '@/utils/auth'
import { Business } from '@/types'

interface PageProps {
  params: Promise<{ businessname: string }>
}

export default function BusinessLoginPage({ params }: PageProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string>('')
  const [businessData, setBusinessData] = useState<Business | null>(null)
  const [loadingState, setLoadingState] = useState<'loading' | 'found' | 'not_found'>('loading')

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const decodedBusinessName = decodeURIComponent(resolvedParams.businessname)
      setBusinessName(decodedBusinessName)
      await loadBusinessData(decodedBusinessName)
    }
    getParams()
  }, [params])

  const loadBusinessData = async (businessNameParam: string) => {
    try {
      const response = await fetch(`/api/businesses/by-name/${encodeURIComponent(businessNameParam)}`)
      const data = await response.json()
      if (data.success && data.business) {
        setBusinessData(data.business)
        setLoadingState('found')
      } else {
        setLoadingState('not_found')
      }
    } catch (error) {
      console.error('Error loading business data:', error)
      setLoadingState('not_found')
    }
  }

  const handleLoginSuccess = (user: BusinessAdminUser) => {
    setBusinessAdminSession(user)
    router.push(`/${businessName}/dashboard`)
  }

  if (loadingState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-poppins screen-enter"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin mb-4"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
        <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>Cargando...</p>
        <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>Verificando negocio</p>
      </div>
    )
  }

  if (loadingState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 font-poppins screen-enter"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-full max-w-sm bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: '#FFF1F0' }}>
              <svg className="w-8 h-8" style={{ color: '#FF3B30' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1C1C1E' }}>Negocio no encontrado</h2>
            <p className="text-sm mb-1" style={{ color: '#8E8E93' }}>
              No existe ningún negocio con el nombre
            </p>
            <p className="text-sm font-semibold mb-4" style={{ color: '#1C1C1E' }}>
              &quot;{businessName}&quot;
            </p>
            <div className="w-full rounded-xl p-4 text-left" style={{ backgroundColor: '#F2F2F7' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#8E8E93' }}>Sugerencias</p>
              <ul className="space-y-1">
                <li className="text-xs" style={{ color: '#1C1C1E' }}>• Verifica que la URL esté correctamente escrita</li>
                <li className="text-xs" style={{ color: '#1C1C1E' }}>• Contacta al dueño del negocio</li>
                <li className="text-xs" style={{ color: '#1C1C1E' }}>• Asegúrate de usar el enlace oficial</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loadingState === 'found' && businessData) {
    return (
      <BusinessLoginForm
        businessName={businessData.business_name}
        businessId={businessData.id}
        businessImageUrl={businessData.business_image_url}
        onSuccess={handleLoginSuccess}
      />
    )
  }

  return null
}
