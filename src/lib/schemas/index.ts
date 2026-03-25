import { z } from 'zod'

// =============================================================
// Auth schemas
// =============================================================

export const BusinessLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  businessId: z.string().uuid('Business ID inválido')
})

export const RegisterBusinessSchema = z.object({
  // Personal data
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  email: z.string().email('Email inválido'),
  phone: z.string().min(7, 'Teléfono inválido').max(20),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  // Business data
  business_name: z.string().min(1, 'El nombre del negocio es requerido').max(200),
  owner_name: z.string().min(1, 'El nombre del propietario es requerido').max(200),
  business_phone: z.string().min(7, 'Teléfono del negocio inválido').max(20),
  address: z.string().min(1, 'La dirección es requerida').max(500),
  token: z.string().min(1, 'El token es requerido')
})

export const RegisterClientSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100),
  last_name: z.string().min(1, 'El apellido es requerido').max(100),
  phone: z.string().min(7, 'Teléfono inválido').max(20),
  token: z.string().min(1, 'El token es requerido')
})

// =============================================================
// Token schemas
// =============================================================

export const TokenGenerateSchema = z.object({
  type: z.enum(['business_admin', 'final_client']),
  businessId: z.string().uuid('Business ID inválido').optional(),
  expiresInDays: z.number().int().min(1).max(365).optional()
})

export const TokenValidateSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  type: z.enum(['business_admin', 'final_client']).optional()
})

// =============================================================
// Appointment schemas
// =============================================================

export const CreateAppointmentSchema = z.object({
  businessId: z.string().uuid('Business ID inválido'),
  clientId: z.string().uuid('Client ID inválido'),
  serviceId: z.string().uuid('Service ID inválido'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato: YYYY-MM-DD)'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (formato: HH:MM)'),
  notes: z.string().max(500).optional()
})

// =============================================================
// Service schemas
// =============================================================

export const CreateServiceSchema = z.object({
  name: z.string().min(1, 'El nombre del servicio es requerido').max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  duration_minutes: z.number().int().min(1, 'La duración mínima es 1 minuto').max(480)
})

// =============================================================
// Demo request schema
// =============================================================

export const DemoRequestSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  business_name: z.string().min(1, 'El nombre del negocio es requerido').max(200),
  email: z.string().email('Email inválido'),
  message: z.string().max(1000).optional()
})
