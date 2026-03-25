'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BusinessAdminUser, requireBusinessAdminAuth } from '@/utils/auth'

interface PageProps {
  params: Promise<{ businessname: string }>
}

interface Client {
  id: string
  first_name: string
  last_name: string
  phone: string
  created_at: string
  appointment_count?: number
  last_appointment?: string
  total_spent?: number
}

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  services?: { id: string; name: string; price: number; duration_minutes: number }
}

interface ClientHistory {
  client: Client
  appointments: Appointment[]
  summary: {
    totalAppointments: number
    completedAppointments: number
    upcomingAppointments: number
    totalSpent: number
    recentActivity: number
    memberSince: string
    lastVisit: string | null
  }
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    pending:   { label: 'Pendiente',   style: { backgroundColor: '#FFFBEB', color: '#B45309' } },
    confirmed: { label: 'Confirmada',  style: { backgroundColor: '#EEF2FF', color: '#6366F1' } },
    completed: { label: 'Completada',  style: { backgroundColor: '#F0FFF4', color: '#15803D' } },
    cancelled: { label: 'Cancelada',   style: { backgroundColor: '#FFF1F0', color: '#FF3B30' } },
  }
  const s = map[status] ?? { label: status, style: { backgroundColor: '#F2F2F7', color: '#8E8E93' } }
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={s.style}>{s.label}</span>
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })

export default function ClientsPage({ params }: PageProps) {
  const router = useRouter()
  const [user, setUser] = useState<BusinessAdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientHistory, setSelectedClientHistory] = useState<ClientHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const loadClients = useCallback(async (businessId: string) => {
    try {
      setLoadingClients(true)
      const response = await fetch(`/api/businesses/${businessId}/clients`)
      const data = await response.json()
      if (data.success) setClients(data.clients)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoadingClients(false)
    }
  }, [])

  const loadClientHistory = useCallback(async (clientId: string) => {
    if (!user?.businessId) return
    try {
      setLoadingHistory(true)
      const response = await fetch(`/api/businesses/${user.businessId}/clients/${clientId}/history`)
      const data = await response.json()
      if (data.success) {
        setSelectedClientHistory(data)
        setShowHistoryModal(true)
      } else {
        alert('Error al cargar el historial del cliente')
      }
    } catch (error) {
      console.error('Error loading client history:', error)
      alert('Error al cargar el historial del cliente')
    } finally {
      setLoadingHistory(false)
    }
  }, [user?.businessId])

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      const businessNameDecoded = decodeURIComponent(resolvedParams.businessname)
      const user = await requireBusinessAdminAuth(businessNameDecoded, router)
      if (user) {
        setUser(user)
        loadClients(user.businessId)
      }
      setIsLoading(false)
    }
    getParams()
  }, [params, router, loadClients])

  const filteredClients = clients.filter(c =>
    c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  const activeThisMonth = clients.filter(c =>
    c.last_appointment && new Date(c.last_appointment).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
  ).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-poppins" style={{ backgroundColor: '#F2F2F7' }}>
        <div className="w-10 h-10 rounded-full border-[3px] border-transparent animate-spin"
          style={{ borderTopColor: '#6366F1', borderRightColor: '#6366F1' }} />
      </div>
    )
  }

  if (!user) return null

  const initials = (c: Client) =>
    `${c.first_name.charAt(0)}${c.last_name.charAt(0)}`.toUpperCase()

  return (
    <div className="min-h-screen font-poppins screen-enter" style={{ backgroundColor: '#F2F2F7' }}>
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">

        {/* Header */}
        <h1 className="text-xl font-bold mb-4" style={{ color: '#1C1C1E' }}>Clientes</h1>

        {/* Stats chips */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xl font-bold" style={{ color: '#6366F1' }}>{clients.length}</p>
            <p className="text-xs" style={{ color: '#8E8E93' }}>Total</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-3 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-xl font-bold" style={{ color: '#34C759' }}>{activeThisMonth}</p>
            <p className="text-xs" style={{ color: '#8E8E93' }}>Activos este mes</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8E8E93' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E5E5EA', color: '#1C1C1E' }}
          />
        </div>

        {/* Client list */}
        {loadingClients ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full" style={{ backgroundColor: '#F2F2F7' }} />
                  <div>
                    <div className="h-4 w-28 rounded mb-1.5" style={{ backgroundColor: '#F2F2F7' }} />
                    <div className="h-3 w-20 rounded" style={{ backgroundColor: '#F2F2F7' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="space-y-3">
            {filteredClients.map(client => (
              <div key={client.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: '#6366F1' }}>
                    {initials(client)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>
                        {client.first_name} {client.last_name}
                      </p>
                      <button
                        onClick={() => loadClientHistory(client.id)}
                        disabled={loadingHistory}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#EEF2FF', color: '#6366F1' }}
                      >
                        {loadingHistory ? '...' : 'Historial'}
                      </button>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{client.phone}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: '#8E8E93' }}>
                        {client.appointment_count ?? 0} citas
                      </span>
                      <span className="text-xs font-medium" style={{ color: '#6366F1' }}>
                        ${client.total_spent?.toFixed(0) ?? '0'}
                      </span>
                      {client.last_appointment && (
                        <span className="text-xs" style={{ color: '#8E8E93' }}>
                          Últ. {formatDate(client.last_appointment)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-12">
            <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin resultados para &ldquo;{searchTerm}&rdquo;</p>
            <button onClick={() => setSearchTerm('')} className="text-xs mt-2" style={{ color: '#6366F1' }}>
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: '#F2F2F7' }}>
              <svg className="w-7 h-7" style={{ color: '#C7C7CC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>Sin clientes aún</p>
            <p className="text-xs mt-1" style={{ color: '#C7C7CC' }}>Los clientes aparecerán cuando se registren</p>
          </div>
        )}
      </div>

      {/* History modal */}
      {showHistoryModal && selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#E5E5EA' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: '#6366F1' }}>
                  {`${selectedClientHistory.client.first_name.charAt(0)}${selectedClientHistory.client.last_name.charAt(0)}`.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1C1C1E' }}>
                    {selectedClientHistory.client.first_name} {selectedClientHistory.client.last_name}
                  </p>
                  <p className="text-xs" style={{ color: '#8E8E93' }}>
                    Desde {formatDate(selectedClientHistory.summary.memberSince)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedClientHistory(null) }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#F2F2F7' }}
              >
                <svg className="w-4 h-4" style={{ color: '#8E8E93' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-0 border-b" style={{ borderColor: '#E5E5EA' }}>
              {[
                { value: selectedClientHistory.summary.totalAppointments, label: 'Total', color: '#6366F1' },
                { value: selectedClientHistory.summary.completedAppointments, label: 'Completadas', color: '#34C759' },
                { value: selectedClientHistory.summary.upcomingAppointments, label: 'Próximas', color: '#FF9500' },
                { value: `$${selectedClientHistory.summary.totalSpent.toFixed(0)}`, label: 'Gastado', color: '#6366F1' },
              ].map((s, i) => (
                <div key={i} className="p-3 text-center" style={{ borderRight: i < 3 ? '1px solid #E5E5EA' : 'none' }}>
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: '#8E8E93' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Appointments history */}
            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: '#8E8E93' }}>
                HISTORIAL DE CITAS ({selectedClientHistory.appointments.length})
              </p>
              {selectedClientHistory.appointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedClientHistory.appointments.map(apt => (
                    <div key={apt.id} className="rounded-xl p-3" style={{ backgroundColor: '#F2F2F7' }}>
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-sm font-semibold" style={{ color: '#1C1C1E' }}>
                          {apt.services?.name ?? 'Servicio eliminado'}
                        </p>
                        {statusBadge(apt.status)}
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs" style={{ color: '#8E8E93' }}>
                          {formatDate(apt.appointment_date)}
                        </p>
                        {apt.services && (
                          <p className="text-xs font-medium" style={{ color: '#6366F1' }}>
                            ${apt.services.price}
                          </p>
                        )}
                        {apt.services && (
                          <p className="text-xs" style={{ color: '#8E8E93' }}>
                            {apt.services.duration_minutes} min
                          </p>
                        )}
                      </div>
                      {apt.notes && (
                        <p className="text-xs mt-1.5" style={{ color: '#8E8E93' }}>Nota: {apt.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: '#8E8E93' }}>Sin citas registradas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
