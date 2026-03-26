// Core Types for MyCard App
export type UserRole = 'superuser' | 'business_admin' | 'final_client'
export type TokenType = 'business_admin' | 'final_client'
export type TokenStatus = 'active' | 'used' | 'expired'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface User {
  id: string
  role: UserRole
  email?: string
  phone?: string
  password_hash?: string
  first_name?: string
  last_name?: string
  created_at: string
  updated_at: string
}

export interface InvitationToken {
  id: string
  token: string
  type: TokenType
  status: TokenStatus
  business_id?: string
  created_by: string
  used_by?: string
  expires_at?: string
  created_at: string
  used_at?: string
}

export interface BusinessTheme {
  primary_color?: string
  secondary_color?: string
  font_family?: string
  custom_css?: string
}

export interface Business {
  id: string
  owner_id: string
  business_name: string
  owner_name: string
  phone: string
  address: string
  address_latitude?: number
  address_longitude?: number
  business_image_url?: string
  theme_settings?: BusinessTheme
  created_at: string
  updated_at: string
}


export interface Service {
  id: string
  business_id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  id: string
  business_id: string
  day_of_week: number // 0 = Sunday
  open_time: string
  close_time: string
  is_active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  client_id: string
  service_id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  notes?: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
}

// Form Types
export interface BusinessAdminRegistrationForm {
  // Personal data
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string

  // Business data
  business_name: string
  owner_name: string
  business_phone: string
  address: string
  business_image?: File
}

export interface FinalClientRegistrationForm {
  first_name: string
  last_name: string
  phone: string
}

export interface LoginForm {
  email: string
  password: string
}

// Dashboard Types
export interface DashboardStats {
  todayAppointments: number
  totalClients: number
  servicesOffered: number
  monthlyRevenue: number
  monthlyAppointments: number
  pendingAppointments: number
}

export interface ActivityItem {
  type: 'appointment' | 'payment' | 'client'
  title: string
  description: string
  timeAgo: string
  timestamp: string
}