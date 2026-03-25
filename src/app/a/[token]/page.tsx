'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessRegistrationForm } from '@/components/forms/BusinessRegistrationForm'
import { generateBusinessSlug } from '@/utils/slug'
import { Business, User } from '@/types'

interface PageProps {
  params: Promise<{ token: string }>
}

export default function BusinessTokenPage({ params }: PageProps) {
  const router = useRouter()
  const [token, setToken] = useState<string>('')
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid' | 'used'>('loading')
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    document.body.style.backgroundColor = '#F2F2F7'
    return () => { document.body.style.backgroundColor = '' }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const validateToken = useCallback(async (tokenValue: string) => {
    try {
      const response = await fetch('/api/tokens/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue, type: 'business_admin' })
      })

      const data = await response.json()

      if (data.success) {
        if (data.token.status === 'active') {
          setTokenStatus('valid')
        } else if (data.token.status === 'used') {
          setTokenStatus('used')
        } else {
          setTokenStatus('invalid')
        }
      } else {
        setTokenStatus('invalid')
      }
    } catch (error) {
      console.error('Token validation error:', error)
      setTokenStatus('invalid')
    }
  }, [])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setToken(resolvedParams.token)
      await validateToken(resolvedParams.token)
    }
    getParams()
  }, [params, validateToken])

  if (showSplash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-poppins"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="text-center screen-enter">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: '#EEF2FF' }}>
            <svg className="w-10 h-10" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: '#1C1C1E' }}>
            Bienvenido a myCard Services
          </h1>
          <p className="text-base font-medium" style={{ color: '#8E8E93' }}>Cargando...</p>
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: '#6366F1',
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.4,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleRegistrationSuccess = (data: { business?: Business, user?: User }) => {
    if (data.business?.business_name) {
      const slug = (data.business as { slug?: string; business_name: string }).slug
        ?? generateBusinessSlug(data.business.business_name)
      router.push(`/${slug}/dashboard`)
    } else {
      router.push('/a/admin')
    }
  }

  if (tokenStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins screen-enter"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 font-poppins screen-enter"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#FFF1F0' }}>
              <svg className="w-7 h-7" style={{ color: '#FF3B30' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1C1C1E' }}>Token Inválido</h2>
            <p className="text-sm" style={{ color: '#8E8E93' }}>
              Este enlace de invitación no es válido o ha expirado. Contacta al administrador para obtener una nueva invitación.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (tokenStatus === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 font-poppins screen-enter"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#FFFBEB' }}>
              <svg className="w-7 h-7" style={{ color: '#F59E0B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#1C1C1E' }}>Token Ya Utilizado</h2>
            <p className="text-sm mb-6" style={{ color: '#8E8E93' }}>
              Esta invitación ya fue utilizada para crear una cuenta.
            </p>
            <button
              onClick={() => router.push('/a/admin')}
              className="text-sm font-semibold px-4 py-2 rounded-[10px]"
              style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}
            >
              Ir al admin →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (tokenStatus === 'valid') {
    return (
      <BusinessRegistrationForm
        token={token}
        onSuccess={handleRegistrationSuccess}
      />
    )
  }

  return null
}
