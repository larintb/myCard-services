import { supabaseAdmin } from '@/lib/supabase-server'

export interface BusinessHour {
  id?: string
  business_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_active: boolean
  created_at?: string
}

// Get business hours for a business
export async function getBusinessHours(businessId: string): Promise<BusinessHour[]> {
  const { data, error } = await supabaseAdmin
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week')

  if (error) {
    console.error('Error fetching business hours:', error)
    throw new Error('Failed to fetch business hours')
  }

  return data || []
}

// Update business hours (replace all)
export async function updateBusinessHours(businessId: string, hours: Omit<BusinessHour, 'id' | 'business_id' | 'created_at'>[]): Promise<void> {
  try {
    // Delete existing hours
    const { error: deleteError } = await supabaseAdmin
      .from('business_hours')
      .delete()
      .eq('business_id', businessId)

    if (deleteError) {
      console.error('Error deleting existing hours:', deleteError)
      throw deleteError
    }

    // Insert new hours (only active ones)
    const activeHours = hours
      .filter(hour => hour.is_active)
      .map(hour => ({
        business_id: businessId,
        day_of_week: hour.day_of_week,
        open_time: hour.open_time,
        close_time: hour.close_time,
        is_active: hour.is_active
      }))

    if (activeHours.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('business_hours')
        .insert(activeHours)

      if (insertError) {
        console.error('Error inserting business hours:', insertError)
        throw insertError
      }
    }
  } catch (error) {
    console.error('Error updating business hours:', error)
    throw new Error('Failed to update business hours')
  }
}

// Check if business is open at a specific time
export async function isBusinessOpen(businessId: string, dayOfWeek: number, time: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return false
  }

  return time >= data.open_time && time <= data.close_time
}

// Get business hours for display (formatted)
export async function getFormattedBusinessHours(businessId: string) {
  const hours = await getBusinessHours(businessId)

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return DAYS.map((dayName, index) => {
    const dayHour = hours.find(h => h.day_of_week === index)

    if (!dayHour || !dayHour.is_active) {
      return {
        day: dayName,
        status: 'Closed',
        open_time: null,
        close_time: null
      }
    }

    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }

    return {
      day: dayName,
      status: `${formatTime(dayHour.open_time)} - ${formatTime(dayHour.close_time)}`,
      open_time: dayHour.open_time,
      close_time: dayHour.close_time
    }
  })
}