'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BusinessAdminUser, requireBusinessAdminAuth } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface ReportData {
  totalRevenue: number
  totalAppointments: number
  totalClients: number
  avgAppointmentValue: number
  monthlyData: { month: string; revenue: number; appointments: number; newClients: number }[]
  topServices: { name: string; count: number; revenue: number }[]
  clientRetention: { returning: number; new: number }
}

export default function ReportsPage({ params }: PageProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string>('')
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loadingReports, setLoadingReports] = useState(true)
  const [dateRange, setDateRange] = useState('3months')

  const loadReportData = useCallback(async (businessId: string) => {
    try {
      setLoadingReports(true)
      const response = await fetch(`/api/businesses/${businessId}/reports?range=${dateRange}`)
      const data = await response.json()
      if (data.success) setReportData(data.reports)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoadingReports(false)
    }
  }, [dateRange])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      setBusinessName(businessNameDecoded)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadReportData(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadReportData])

  useEffect(() => {
    if (user?.businessId) loadReportData(user.businessId)
  }, [dateRange, user?.businessId, loadReportData])

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n)

  const fmtMonth = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  const rangeOptions = [
    { key: '1month', label: '1M' },
    { key: '3months', label: '3M' },
    { key: '6months', label: '6M' },
    { key: '1year', label: '1A' },
  ]

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Link href={`/${businessName}/settings`}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA' }}>
              <svg className="w-4 h-4" style={{ color: '#6366F1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>Reportes</h1>
          </div>

          {/* Range pills */}
          <div className="flex gap-1">
            {rangeOptions.map(r => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: dateRange === r.key ? '#6366F1' : '#FFFFFF',
                  color: dateRange === r.key ? '#FFFFFF' : '#8E8E93',
                  border: dateRange === r.key ? 'none' : '1px solid #E5E5EA',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loadingReports ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-20"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="h-6 w-16 rounded mb-2" style={{ backgroundColor: '#F2F2F7' }} />
                <div className="h-3 w-20 rounded" style={{ backgroundColor: '#F2F2F7' }} />
              </div>
            ))}
          </div>
        ) : reportData ? (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { value: fmtCurrency(reportData.totalRevenue), label: 'Ingresos totales', color: '#6366F1' },
                { value: reportData.totalAppointments, label: 'Citas totales', color: '#34C759' },
                { value: reportData.totalClients, label: 'Clientes', color: '#FF9500' },
                { value: fmtCurrency(reportData.avgAppointmentValue), label: 'Promedio por cita', color: '#6366F1' },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{m.label}</p>
                </div>
              ))}
            </div>

            {/* Monthly trends */}
            {reportData.monthlyData?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>TENDENCIA MENSUAL</p>
                {reportData.monthlyData.map((m, i) => (
                  <div key={i}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: i < reportData.monthlyData.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                    <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>{fmtMonth(m.month)}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: '#6366F1' }}>{fmtCurrency(m.revenue)}</p>
                        <p className="text-[10px]" style={{ color: '#8E8E93' }}>{m.appointments} citas · {m.newClients} nuevos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top services */}
            {reportData.topServices?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>TOP SERVICIOS</p>
                {reportData.topServices.map((s, i) => (
                  <div key={i}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: i < reportData.topServices.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#1C1C1E' }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: '#8E8E93' }}>{s.count} citas</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: '#6366F1' }}>{fmtCurrency(s.revenue)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Client retention */}
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>CLIENTES</p>
              <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F2F2F7' }}>
                <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>Clientes recurrentes</span>
                <span className="text-sm font-bold" style={{ color: '#34C759' }}>{reportData.clientRetention?.returning ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #F2F2F7' }}>
                <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>Clientes nuevos</span>
                <span className="text-sm font-bold" style={{ color: '#6366F1' }}>{reportData.clientRetention?.new ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs font-medium" style={{ color: '#1C1C1E' }}>Tasa de retención</span>
                <span className="text-sm font-bold" style={{ color: '#6366F1' }}>
                  {reportData.clientRetention
                    ? Math.round((reportData.clientRetention.returning / Math.max(reportData.clientRetention.returning + reportData.clientRetention.new, 1)) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#F2F2F7' }}>
              <svg className="w-7 h-7" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin datos disponibles</p>
            <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>Completa citas para ver reportes</p>
          </div>
        )}
      </div>
    </div>
  )
}
