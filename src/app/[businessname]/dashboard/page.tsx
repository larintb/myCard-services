'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { requireBusinessAdminAuth, clearBusinessAdminSession, BusinessAdminUser } from '@/utils/auth'
import { DashboardStats, ActivityItem } from '@/types'

interface PageProps {
  params: Promise<{ businessname: string }>
}

export default function BusinessDashboard({ params }: PageProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string>('')
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const loadDashboardData = useCallback(async (businessId: string) => {
    try {
      setLoadingData(true)
      const [statsResponse, activityResponse] = await Promise.all([
        fetch(`/api/dashboard/${businessId}/stats`),
        fetch(`/api/dashboard/${businessId}/recent-activity`)
      ])
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) setStats(statsData.stats)
      }
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        if (activityData.success) setRecentActivity(activityData.activities)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoadingData(false)
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
        loadDashboardData(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadDashboardData])

  const handleLogout = () => {
    setUser(null)
    clearBusinessAdminSession()
    router.push(`/${businessName}/login`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-poppins"
        style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  const statCards = [
    {
      value: stats?.todayAppointments ?? 0,
      label: 'Citas hoy',
      color: '#6366F1',
      bg: '#EEF2FF',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      value: stats?.totalClients ?? 0,
      label: 'Clientes',
      color: '#34C759',
      bg: '#F0FFF4',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      value: stats?.servicesOffered ?? 0,
      label: 'Servicios',
      color: '#FF9500',
      bg: '#FFFBEB',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      value: `$${stats?.monthlyRevenue?.toFixed(0) ?? '0'}`,
      label: 'Ingresos del mes',
      color: '#6366F1',
      bg: '#EEF2FF',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  const quickActions = [
    { label: 'Citas', href: `/${businessName}/appointments`, color: '#6366F1', bg: '#EEF2FF',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { label: 'Servicios', href: `/${businessName}/services`, color: '#FF9500', bg: '#FFFBEB',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
    { label: 'Clientes', href: `/${businessName}/clients`, color: '#34C759', bg: '#F0FFF4',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: 'Ajustes', href: `/${businessName}/settings`, color: '#8E8E93', bg: '#F2F2F7',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ]

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>{user.businessName}</h1>
            <p className="text-sm mt-0.5" style={{ color: '#8E8E93' }}>Hola, {user.first_name} 👋</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-1.5 rounded-[10px]"
            style={{ color: '#8E8E93', backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA' }}
          >
            Salir
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              {loadingData ? (
                <div className="animate-pulse">
                  <div className="h-7 w-10 rounded mb-1" style={{ backgroundColor: '#F2F2F7' }} />
                  <div className="h-3 w-16 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                    style={{ backgroundColor: s.bg, color: s.color }}>
                    {s.icon}
                  </div>
                  <p className="text-xl font-bold" style={{ color: '#1C1C1E' }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{s.label}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-4 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>ACCESO RÁPIDO</p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((a, i) => (
              <Link key={i} href={a.href} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: a.bg, color: a.color }}>
                  {a.icon}
                </div>
                <span className="text-[10px] font-medium text-center" style={{ color: '#1C1C1E' }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#1C1C1E' }}>Actividad reciente</p>

          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid #F2F2F7' }}>
                  <div>
                    <div className="h-3.5 w-32 rounded mb-1.5" style={{ backgroundColor: '#F2F2F7' }} />
                    <div className="h-3 w-24 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                  </div>
                  <div className="h-3 w-12 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-0">
              {recentActivity.map((activity, index) => (
                <div key={index}
                  className="flex items-start justify-between py-3"
                  style={{ borderBottom: index < recentActivity.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: '#EEF2FF' }}>
                      <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1C1C1E' }}>{activity.title}</p>
                      <p className="text-xs truncate" style={{ color: '#8E8E93' }}>{activity.description}</p>
                    </div>
                  </div>
                  <span className="text-xs ml-2 flex-shrink-0" style={{ color: '#8E8E93' }}>{activity.timeAgo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: '#F2F2F7' }}>
                <svg className="w-6 h-6" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin actividad reciente</p>
              <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>Las reservas aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
