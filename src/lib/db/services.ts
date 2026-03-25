import { supabaseAdmin } from '@/lib/supabase-server'

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

export interface CreateServiceData {
  business_id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active?: boolean
}

// Get all services for a business
export async function getServicesByBusinessId(businessId: string): Promise<Service[]> {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching services:', error)
    throw new Error('Failed to fetch services')
  }

  return data || []
}

// Create a new service
export async function createService(serviceData: CreateServiceData): Promise<Service> {
  const { data, error } = await supabaseAdmin
    .from('services')
    .insert(serviceData)
    .select()
    .single()

  if (error) {
    console.error('Error creating service:', error)
    throw new Error('Failed to create service')
  }

  return data
}

// Update a service
export async function updateService(serviceId: string, updates: Partial<Service>): Promise<Service> {
  const { data, error } = await supabaseAdmin
    .from('services')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', serviceId)
    .select()
    .single()

  if (error) {
    console.error('Error updating service:', error)
    throw new Error('Failed to update service')
  }

  return data
}

// Delete a service (soft delete)
export async function deleteService(serviceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('services')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', serviceId)

  if (error) {
    console.error('Error deleting service:', error)
    throw new Error('Failed to delete service')
  }
}

// Get service by ID
export async function getServiceById(serviceId: string): Promise<Service | null> {
  const { data, error } = await supabaseAdmin
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching service:', error)
    throw new Error('Failed to fetch service')
  }

  return data
}