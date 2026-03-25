import { supabaseAdmin } from '@/lib/supabase-server'
import { Business, BusinessTheme } from '@/types'
import { generateBusinessSlug } from '@/utils/slug'
export { generateBusinessSlug } from '@/utils/slug'

export interface CreateBusinessData {
  owner_id: string
  business_name: string
  owner_name: string
  phone: string
  address: string
  business_image_url?: string
  theme_settings?: BusinessTheme
}

// Create a new business
export async function createBusiness(businessData: CreateBusinessData): Promise<Business> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .insert(businessData)
    .select()
    .single()

  if (error) {
    console.error('Error creating business:', error)
    throw new Error('Failed to create business')
  }

  return data
}

// Get business by ID
export async function getBusinessById(businessId: string): Promise<Business | null> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Business not found
    }
    console.error('Error fetching business:', error)
    throw new Error('Failed to fetch business')
  }

  return data
}

// Get business by owner ID
export async function getBusinessByOwnerId(ownerId: string): Promise<Business | null> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Business not found
    }
    console.error('Error fetching business by owner:', error)
    throw new Error('Failed to fetch business')
  }

  return data
}

// Get business by name (for dynamic routes like /bella-salon/login)
export async function getBusinessByName(slugParam: string): Promise<Business | null> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*')

  if (error) {
    console.error('Error fetching business by name:', error)
    return null
  }

  if (!data || data.length === 0) return null

  const targetSlug = generateBusinessSlug(slugParam.replace(/-/g, ' '))
  return data.find(b => generateBusinessSlug(b.business_name) === targetSlug) || null
}

// Get all businesses
export async function getAllBusinesses(): Promise<Business[]> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching businesses:', error)
    throw new Error('Failed to fetch businesses')
  }

  return data || []
}

// Update business data
export async function updateBusiness(businessId: string, updates: Partial<Business>): Promise<Business> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', businessId)
    .select()
    .single()

  if (error) {
    console.error('Error updating business:', error)
    throw new Error('Failed to update business')
  }

  return data
}

// Update business theme
export async function updateBusinessTheme(businessId: string, theme: BusinessTheme): Promise<Business> {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId)
    .select()
    .single()

  if (error) {
    console.error('Error updating business theme:', error)
    throw new Error('Failed to update business theme')
  }

  return data
}

// Delete business
export async function deleteBusiness(businessId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('businesses')
    .delete()
    .eq('id', businessId)

  if (error) {
    console.error('Error deleting business:', error)
    throw new Error('Failed to delete business')
  }
}


// Get business stats for dashboard
export async function getBusinessStats() {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id, created_at')

  if (error) {
    console.error('Error fetching business stats:', error)
    return { total: 0, thisMonth: 0 }
  }

  const total = data.length
  const thisMonth = data.filter(business => {
    const createdDate = new Date(business.created_at)
    const now = new Date()
    return createdDate.getMonth() === now.getMonth() &&
           createdDate.getFullYear() === now.getFullYear()
  }).length

  return { total, thisMonth }
}