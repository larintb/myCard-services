// =============================================================
// Application constants — single source of truth for magic strings
// =============================================================

export const ROLES = {
  SUPERUSER: 'superuser',
  BUSINESS_ADMIN: 'business_admin',
  FINAL_CLIENT: 'final_client'
} as const

export const TOKEN_STATUS = {
  ACTIVE: 'active',
  USED: 'used',
  EXPIRED: 'expired'
} as const

export const TOKEN_TYPES = {
  BUSINESS_ADMIN: 'business_admin',
  FINAL_CLIENT: 'final_client'
} as const

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const
