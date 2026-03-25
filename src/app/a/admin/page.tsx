'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SuperUserLoginForm } from '@/components/forms/SuperUserLoginForm'
import { generateBusinessSlug } from '@/utils/slug'
import { User, Business } from '@/types'

interface RecentAppointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  users?: { first_name?: string; last_name?: string }
  services?: { name?: string }
}

interface BusinessWithStats extends Business {
  stats?: {
    activeServices?: number
    totalClients?: number
    activeTokens?: number
    totalAppointments?: number
  }
  recentAppointments?: RecentAppointment[]
}

interface DemoRequest {
  id: string
  name: string
  business_name: string
  email: string
  message?: string
  status: 'pending' | 'contacted' | 'completed' | 'declined'
  created_at: string
  updated_at: string
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businessToken, setBusinessToken] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [tokenQuantity, setTokenQuantity] = useState(1)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<{ activeBusinesses: number; totalClients: number; activeTokens: number; totalAppointments: number } | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [generatedTokens, setGeneratedTokens] = useState<string[]>([])
  const [selectedBusinessDetails, setSelectedBusinessDetails] = useState<BusinessWithStats | null>(null)
  const [loadingBusinessDetails, setLoadingBusinessDetails] = useState(false)
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([])
  const [loadingDemoRequests, setLoadingDemoRequests] = useState(false)
  const [showDemoRequests, setShowDemoRequests] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const checkAuth = useCallback(() => {
    const savedUser = localStorage.getItem('superuser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        if (userData.id && userData.id.length === 36) {
          setUser(userData)
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('superuser')
        }
      } catch {
        localStorage.removeItem('superuser')
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const loadAdminData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [businessesResponse, statsResponse] = await Promise.all([
        fetch('/api/admin/businesses'),
        fetch('/api/admin/stats')
      ])
      if (businessesResponse.ok) {
        const d = await businessesResponse.json()
        if (d.success) setBusinesses(d.businesses)
      }
      if (statsResponse.ok) {
        const d = await statsResponse.json()
        if (d.success) setStats(d.stats)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoadingData(false)
    }
  }, [])

  const loadDemoRequests = useCallback(async () => {
    setLoadingDemoRequests(true)
    try {
      const savedUser = localStorage.getItem('superuser')
      if (!savedUser) return
      const response = await fetch('/api/demo-requests', {
        headers: { 'x-superuser-session': savedUser, 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (result.success) {
        setDemoRequests(result.data)
      } else if (response.status === 401) {
        setIsAuthenticated(false)
        localStorage.removeItem('superuser')
      }
    } catch (error) {
      console.error('Error loading demo requests:', error)
    } finally {
      setLoadingDemoRequests(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData()
      loadDemoRequests()
    }
  }, [isAuthenticated, loadAdminData, loadDemoRequests])

  const updateDemoRequestStatus = async (id: string, status: string) => {
    try {
      const savedUser = localStorage.getItem('superuser')
      if (!savedUser) return
      const response = await fetch('/api/demo-requests', {
        method: 'PATCH',
        headers: { 'x-superuser-session': savedUser, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const result = await response.json()
      if (result.success) {
        setDemoRequests(prev =>
          prev.map(r => r.id === id ? { ...r, status: status as DemoRequest['status'] } : r)
        )
      } else if (response.status === 401) {
        setIsAuthenticated(false)
        localStorage.removeItem('superuser')
      }
    } catch (error) {
      console.error('Error updating demo request:', error)
    }
  }

  const handleLoginSuccess = (userData: User) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('superuser', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('superuser')
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const generateBusinessToken = async () => {
    if (!user?.id) return
    setIsGenerating(true)
    try {
      const response = await fetch('/api/tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'business_admin', createdBy: user.id, expiresInDays: 30 })
      })
      const data = await response.json()
      if (data.success) {
        setBusinessToken(data.token)
        loadAdminData()
      }
    } catch (error) {
      console.error('Error generating token:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateClientTokens = async () => {
    if (!selectedBusiness || !user?.id) return
    if (tokenQuantity < 1 || tokenQuantity > 50) return
    setIsGenerating(true)
    const tokens: string[] = []
    try {
      for (let i = 0; i < tokenQuantity; i++) {
        const response = await fetch('/api/tokens/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'final_client', createdBy: user.id, businessId: selectedBusiness })
        })
        const data = await response.json()
        if (data.success) {
          tokens.push(data.token)
        } else break
      }
      if (tokens.length > 0) {
        setGeneratedTokens(tokens)
        loadAdminData()
      }
    } catch (error) {
      console.error('Error generating tokens:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const loadBusinessDetails = async (businessId: string) => {
    setLoadingBusinessDetails(true)
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}`)
      const data = await response.json()
      if (data.success) setSelectedBusinessDetails(data.business)
    } catch (error) {
      console.error('Error loading business details:', error)
    } finally {
      setLoadingBusinessDetails(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SuperUserLoginForm onSuccess={handleLoginSuccess} />
  }

  const pendingCount = demoRequests.filter(r => r.status === 'pending').length

  const statusBadge = (status: DemoRequest['status']) => {
    const map = {
      pending:   { label: 'Pendiente',  style: { backgroundColor: '#FFFBEB', color: '#F59E0B' } },
      contacted: { label: 'Contactado', style: { backgroundColor: '#EFF6FF', color: '#3B82F6' } },
      completed: { label: 'Completado', style: { backgroundColor: '#F0FFF4', color: '#34C759' } },
      declined:  { label: 'Rechazado',  style: { backgroundColor: '#FFF1F0', color: '#FF3B30' } },
    }
    const b = map[status] ?? map.pending
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={b.style}>{b.label}</span>
    )
  }

  const apptStatusBadge = (status: string) => {
    const map: Record<string, { label: string; style: React.CSSProperties }> = {
      confirmed: { label: 'Confirmada', style: { backgroundColor: '#EEF2FF', color: '#6366F1' } },
      pending:   { label: 'Pendiente',  style: { backgroundColor: '#FFFBEB', color: '#F59E0B' } },
      completed: { label: 'Completada', style: { backgroundColor: '#F0FFF4', color: '#34C759' } },
      cancelled: { label: 'Cancelada',  style: { backgroundColor: '#FFF1F0', color: '#FF3B30' } },
    }
    const b = map[status] ?? { label: status, style: { backgroundColor: '#F2F2F7', color: '#8E8E93' } }
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={b.style}>{b.label}</span>
  }

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-10 max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>myCard Admin</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8E8E93' }}>Bienvenido, {user?.first_name}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-1.5 rounded-[10px]"
            style={{ color: '#8E8E93', backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA' }}
          >
            Salir
          </button>
        </div>

        {/* Stats 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              key: 'activeBusinesses',
              label: 'Negocios Activos',
              value: stats?.activeBusinesses ?? 0,
              iconBg: '#EEF2FF', iconColor: '#6366F1',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            },
            {
              key: 'totalClients',
              label: 'Total Clientes',
              value: stats?.totalClients ?? 0,
              iconBg: '#F0FFF4', iconColor: '#34C759',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            },
            {
              key: 'activeTokens',
              label: 'Tokens Activos',
              value: stats?.activeTokens ?? 0,
              iconBg: '#F5F3FF', iconColor: '#8B5CF6',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            },
            {
              key: 'totalAppointments',
              label: 'Total Citas',
              value: stats?.totalAppointments ?? 0,
              iconBg: '#FFFBEB', iconColor: '#F59E0B',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            },
          ].map(stat => (
            <div key={stat.key} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {loadingData ? (
                <div className="animate-pulse space-y-2">
                  <div className="w-8 h-8 rounded-xl" style={{ backgroundColor: '#F2F2F7' }} />
                  <div className="h-6 w-10 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                  <div className="h-3 w-20 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: stat.iconBg }}>
                    <svg className="w-4 h-4" style={{ color: stat.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {stat.icon}
                    </svg>
                  </div>
                  <p className="text-xl font-bold" style={{ color: '#1C1C1E' }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{stat.label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Token de Negocio */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <p className="text-sm font-bold mb-0.5" style={{ color: '#1C1C1E' }}>Token de Negocio</p>
          <p className="text-xs mb-4" style={{ color: '#8E8E93' }}>Genera invitaciones para nuevos negocios</p>

          <button
            onClick={generateBusinessToken}
            disabled={isGenerating}
            className="w-full py-3 rounded-[14px] text-sm font-semibold text-white"
            style={{ backgroundColor: isGenerating ? '#A5B4FC' : '#6366F1', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                Generando...
              </span>
            ) : 'Generar token'}
          </button>

          {businessToken && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#8E8E93' }}>TOKEN</p>
                <div className="px-3 py-2.5 rounded-xl font-mono text-xs break-all" style={{ backgroundColor: '#F2F2F7', color: '#1C1C1E' }}>
                  {businessToken}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#8E8E93' }}>URL DE INVITACIÓN</p>
                <div className="px-3 py-2.5 rounded-xl text-xs break-all" style={{ backgroundColor: '#F2F2F7', color: '#6366F1' }}>
                  {origin}/a/{businessToken}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(businessToken, 'biz-token')}
                  className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold"
                  style={{ border: '1.5px solid #E5E5EA', color: copiedKey === 'biz-token' ? '#34C759' : '#6366F1', backgroundColor: '#FFFFFF' }}
                >
                  {copiedKey === 'biz-token' ? '¡Copiado!' : 'Copiar token'}
                </button>
                <button
                  onClick={() => copyToClipboard(`${origin}/a/${businessToken}`, 'biz-url')}
                  className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold"
                  style={{ border: '1.5px solid #E5E5EA', color: copiedKey === 'biz-url' ? '#34C759' : '#6366F1', backgroundColor: '#FFFFFF' }}
                >
                  {copiedKey === 'biz-url' ? '¡Copiado!' : 'Copiar URL'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tokens de Cliente */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <p className="text-sm font-bold mb-0.5" style={{ color: '#1C1C1E' }}>Tokens de Cliente</p>
          <p className="text-xs mb-4" style={{ color: '#8E8E93' }}>Genera tokens NFC vinculados a un negocio</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>NEGOCIO</label>
              {loadingData ? (
                <div className="h-11 rounded-xl animate-pulse" style={{ backgroundColor: '#F2F2F7' }} />
              ) : (
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                  style={{ border: '1.5px solid #E5E5EA', color: '#1C1C1E', backgroundColor: '#FAFAFA' }}
                >
                  <option value="">Selecciona un negocio...</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.business_name} — {b.owner_name}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#8E8E93' }}>CANTIDAD (1-50)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={tokenQuantity}
                onChange={(e) => setTokenQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none"
                style={{ border: '1.5px solid #E5E5EA', color: '#1C1C1E', backgroundColor: '#FAFAFA' }}
              />
            </div>

            <button
              onClick={generateClientTokens}
              disabled={isGenerating || !selectedBusiness}
              className="w-full py-3 rounded-[14px] text-sm font-semibold text-white"
              style={{
                backgroundColor: isGenerating || !selectedBusiness ? '#A5B4FC' : '#6366F1',
                cursor: isGenerating || !selectedBusiness ? 'not-allowed' : 'pointer'
              }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: 'white', borderRightColor: 'white' }} />
                  Generando...
                </span>
              ) : `Generar ${tokenQuantity} token${tokenQuantity !== 1 ? 's' : ''}`}
            </button>
          </div>

          {generatedTokens.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold" style={{ color: '#34C759' }}>
                  ✓ {generatedTokens.length} token{generatedTokens.length !== 1 ? 's' : ''} generado{generatedTokens.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => setGeneratedTokens([])}
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: '#F2F2F7', color: '#8E8E93' }}>
                  Limpiar
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {generatedTokens.map((token, index) => (
                  <div key={token} className="rounded-xl p-3" style={{ backgroundColor: '#F2F2F7' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: '#8E8E93' }}>Token #{index + 1}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => copyToClipboard(token, `ct-${index}`)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg bg-white"
                          style={{ color: copiedKey === `ct-${index}` ? '#34C759' : '#6366F1', border: '1px solid #E5E5EA' }}
                        >
                          {copiedKey === `ct-${index}` ? '¡Copiado!' : 'Token'}
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${origin}/c/${token}`, `cu-${index}`)}
                          className="text-xs font-semibold px-2 py-1 rounded-lg bg-white"
                          style={{ color: copiedKey === `cu-${index}` ? '#34C759' : '#6366F1', border: '1px solid #E5E5EA' }}
                        >
                          {copiedKey === `cu-${index}` ? '¡Copiado!' : 'URL'}
                        </button>
                      </div>
                    </div>
                    <p className="font-mono text-xs break-all" style={{ color: '#1C1C1E' }}>{token}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copyToClipboard(generatedTokens.join('\n'), 'all-tokens')}
                  className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold"
                  style={{ border: '1.5px solid #E5E5EA', color: copiedKey === 'all-tokens' ? '#34C759' : '#6366F1', backgroundColor: '#FFFFFF' }}
                >
                  {copiedKey === 'all-tokens' ? '¡Copiados!' : 'Copiar todos'}
                </button>
                <button
                  onClick={() => copyToClipboard(generatedTokens.map(t => `${origin}/c/${t}`).join('\n'), 'all-urls')}
                  className="flex-1 py-2.5 rounded-[10px] text-xs font-semibold"
                  style={{ border: '1.5px solid #E5E5EA', color: copiedKey === 'all-urls' ? '#34C759' : '#6366F1', backgroundColor: '#FFFFFF' }}
                >
                  {copiedKey === 'all-urls' ? '¡Copiadas!' : 'Copiar URLs'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Negocios registrados */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>Negocios registrados</p>
            {!loadingData && businesses.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}>
                {businesses.length}
              </span>
            )}
          </div>

          {loadingData ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-36 rounded mb-2" style={{ backgroundColor: '#F2F2F7' }} />
                  <div className="h-3 w-48 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                </div>
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#8E8E93' }}>Sin negocios registrados</p>
          ) : (
            <div className="space-y-0">
              {businesses.map((business, idx) => (
                <div key={business.id}>
                  <div className="py-3" style={{
                    borderBottom: idx < businesses.length - 1 ? '1px solid #F2F2F7' : 'none'
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-bold truncate" style={{ color: '#1C1C1E' }}>
                          {business.business_name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#8E8E93' }}>
                          {business.owner_name} · {business.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link
                          href={`/${generateBusinessSlug(business.business_name)}/dashboard`}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          target="_blank"
                          style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}
                        >
                          Ver panel →
                        </Link>
                        <button
                          onClick={() => selectedBusinessDetails?.id === business.id
                            ? setSelectedBusinessDetails(null)
                            : loadBusinessDetails(business.id)
                          }
                          disabled={loadingBusinessDetails && selectedBusinessDetails?.id !== business.id}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: '#F2F2F7', color: '#8E8E93' }}
                        >
                          {loadingBusinessDetails && selectedBusinessDetails?.id === business.id
                            ? '...' : selectedBusinessDetails?.id === business.id ? 'Cerrar' : 'Detalles'}
                        </button>
                      </div>
                    </div>

                    {/* Detalles expandibles */}
                    {selectedBusinessDetails?.id === business.id && (
                      <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: '#F2F2F7', borderLeft: '4px solid #6366F1' }}>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {[
                            { label: 'Servicios', value: selectedBusinessDetails.stats?.activeServices ?? 0, color: '#6366F1' },
                            { label: 'Clientes', value: selectedBusinessDetails.stats?.totalClients ?? 0, color: '#34C759' },
                            { label: 'Tokens', value: selectedBusinessDetails.stats?.activeTokens ?? 0, color: '#8B5CF6' },
                            { label: 'Citas', value: selectedBusinessDetails.stats?.totalAppointments ?? 0, color: '#F59E0B' },
                          ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                              <p className="text-xs" style={{ color: '#8E8E93' }}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1 text-xs" style={{ color: '#8E8E93' }}>
                          <p><span className="font-semibold">Dirección:</span> {selectedBusinessDetails.address}</p>
                          <p><span className="font-semibold">Creado:</span> {new Date(selectedBusinessDetails.created_at).toLocaleDateString('es-ES')}</p>
                        </div>

                        {selectedBusinessDetails.recentAppointments && selectedBusinessDetails.recentAppointments.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold mb-2" style={{ color: '#1C1C1E' }}>Citas recientes</p>
                            <div className="space-y-1.5">
                              {selectedBusinessDetails.recentAppointments.map(apt => (
                                <div key={apt.id} className="bg-white rounded-xl px-3 py-2 flex items-center justify-between"
                                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate" style={{ color: '#1C1C1E' }}>
                                      {apt.users?.first_name} {apt.users?.last_name}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: '#8E8E93' }}>{apt.services?.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    <p className="text-xs" style={{ color: '#8E8E93' }}>
                                      {new Date(apt.appointment_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                    </p>
                                    {apptStatusBadge(apt.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solicitudes Demo */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>Solicitudes Demo</p>
              {pendingCount > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: '#FF3B30' }}>
                  {pendingCount}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setShowDemoRequests(!showDemoRequests)
                if (!showDemoRequests && demoRequests.length === 0) loadDemoRequests()
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-[10px]"
              style={{ color: '#6366F1', backgroundColor: '#EEF2FF' }}
            >
              {showDemoRequests ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <p className="text-xs mb-0" style={{ color: '#8E8E93' }}>Solicitudes del landing page</p>

          {showDemoRequests && (
            <div className="mt-4">
              {loadingDemoRequests ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: '#F2F2F7' }} />
                  ))}
                </div>
              ) : demoRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: '#8E8E93' }}>Sin solicitudes</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {demoRequests.map(request => (
                    <div key={request.id} className="rounded-xl p-4"
                      style={{
                        backgroundColor: '#F2F2F7',
                        borderLeft: request.status === 'pending' ? '4px solid #F59E0B' : '4px solid transparent'
                      }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold truncate" style={{ color: '#1C1C1E' }}>{request.name}</p>
                            {statusBadge(request.status)}
                          </div>
                          <p className="text-xs" style={{ color: '#8E8E93' }}>
                            {request.business_name} · {request.email}
                          </p>
                          {request.message && (
                            <p className="text-xs mt-1.5 italic" style={{ color: '#8E8E93' }}>{request.message}</p>
                          )}
                          <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>
                            {new Date(request.created_at).toLocaleDateString('es-ES', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateDemoRequestStatus(request.id, 'contacted')}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ backgroundColor: '#EFF6FF', color: '#3B82F6' }}
                            >
                              Contactado
                            </button>
                            <button
                              onClick={() => updateDemoRequestStatus(request.id, 'declined')}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                              style={{ backgroundColor: '#FFF1F0', color: '#FF3B30' }}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {request.status === 'contacted' && (
                          <button
                            onClick={() => updateDemoRequestStatus(request.id, 'completed')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                            style={{ backgroundColor: '#F0FFF4', color: '#34C759' }}
                          >
                            Completado
                          </button>
                        )}
                        <button
                          onClick={() => window.open(`mailto:${request.email}`, '_blank')}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: '#F2F2F7', color: '#8E8E93', border: '1px solid #E5E5EA' }}
                        >
                          Email
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
