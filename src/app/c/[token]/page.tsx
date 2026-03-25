'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { ClientRegistrationForm } from '@/components/forms/ClientRegistrationForm'
import { ClientAppointmentInterface } from '@/components/client/ClientAppointmentInterface'
import { useBusinessTheme } from '@/hooks/useBusinessTheme'
import { Business, Service, User } from '@/types'

interface PageProps {
  params: Promise<{ token: string }>
}

export default function ClientTokenPage({ params }: PageProps) {
  const [token, setToken] = useState<string>('')
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid' | 'registered'>('loading')
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [showSplash, setShowSplash] = useState(false)

  const { isLoading: themeLoading } = useBusinessTheme(business?.id)

  const loadBusinessServices = useCallback(async (businessId: string) => {
    try {
      const response = await fetch(`/api/businesses/${businessId}/services`)
      const data = await response.json()
      if (data.success) {
        const activeServices = data.services.filter((service: Service) => service.is_active)
        setServices(activeServices)
      }
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }, [])

  const validateTokenAndLoadData = useCallback(async (tokenValue: string) => {
    try {
      const response = await fetch('/api/tokens/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue, type: 'final_client' })
      })

      const data = await response.json()

      if (data.success) {
        if (data.business) {
          setBusiness(data.business)
          await loadBusinessServices(data.business.id)
        }

        if (data.isRegistered && data.user) {
          setUser(data.user)
          setTokenStatus('registered')
        } else {
          setTokenStatus('valid')
        }

        setShowSplash(true)
        setTimeout(() => setShowSplash(false), 2200)
      } else {
        setTokenStatus('invalid')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      setTokenStatus('invalid')
    }
  }, [loadBusinessServices])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setToken(resolvedParams.token)
      await validateTokenAndLoadData(resolvedParams.token)
    }
    getParams()
  }, [params, validateTokenAndLoadData])

  const handleRegistrationSuccess = (data: { user: User }) => {
    setUser(data.user)
    setTokenStatus('registered')
  }

  /* ── Loading ─────────────────────────────────────────────────── */
  if (tokenStatus === 'loading' || themeLoading) {
    return (
      <div className="min-h-screen font-poppins flex items-center justify-center" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <div
              className="w-16 h-16 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }}
            />
          </div>
          <h3 className="text-xl font-semibold mb-1" style={{ color: '#1C1C1E' }}>Cargando...</h3>
          <p className="text-sm" style={{ color: '#8E8E93' }}>Validando tu acceso</p>
        </div>
      </div>
    )
  }

  /* ── Splash ──────────────────────────────────────────────────── */
  if (showSplash && business) {
    return (
      <div
        className="min-h-screen font-poppins flex items-center justify-center"
        style={{ backgroundColor: '#F2F2F7' }}
      >
        <div className="text-center screen-enter">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-xl mb-6 flex items-center justify-center"
            style={{ backgroundColor: '#6366F1' }}
          >
            {business.business_image_url ? (
              <Image
                src={business.business_image_url}
                alt={`Logo de ${business.business_name}`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                priority
              />
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#1C1C1E' }}>
            {business.business_name}
          </h1>
          <p className="text-lg" style={{ color: '#8E8E93' }}>Bienvenido</p>
        </div>
      </div>
    )
  }

  /* ── Invalid ─────────────────────────────────────────────────── */
  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen font-poppins flex items-center justify-center p-4" style={{ backgroundColor: '#F2F2F7' }}>
        <div
          className="bg-white rounded-2xl p-8 max-w-sm w-full text-center screen-enter"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
        >
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: '#FF3B30' }}
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1C1C1E' }}>Enlace no válido</h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: '#8E8E93' }}>
            Este enlace de tarjeta de negocio no es válido o ha sido desactivado.
          </p>

          <div className="rounded-xl p-4 mb-6 text-left" style={{ backgroundColor: '#F2F2F7' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1C1C1E' }}>¿Qué puedes hacer?</p>
            <ul className="text-sm space-y-1" style={{ color: '#8E8E93' }}>
              <li>• Solicita una nueva tarjeta al negocio</li>
              <li>• Verifica que el enlace esté completo</li>
              <li>• Contacta directamente al establecimiento</li>
            </ul>
          </div>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3.5 rounded-[14px] font-semibold text-white transition-opacity active:opacity-80"
            style={{ backgroundColor: '#6366F1' }}
          >
            Regresar
          </button>
        </div>
      </div>
    )
  }

  /* ── Registration ────────────────────────────────────────────── */
  if (tokenStatus === 'valid' && business && !showSplash) {
    return (
      <ClientRegistrationForm
        token={token}
        business={business}
        onSuccess={handleRegistrationSuccess}
      />
    )
  }

  /* ── Main app ────────────────────────────────────────────────── */
  if (tokenStatus === 'registered' && business && user && !showSplash) {
    return (
      <ClientAppointmentInterface
        business={business}
        services={services}
        user={user}
        token={token}
      />
    )
  }

  return null
}
