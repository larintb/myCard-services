import { NextResponse } from 'next/server'
import { getBusinessHours, updateBusinessHours } from '@/lib/db/businessHours'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

// GET /api/businesses/[businessId]/hours
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const hours = await getBusinessHours(businessId)

    return NextResponse.json({
      success: true,
      hours
    })

  } catch (error) {
    console.error('Error fetching business hours:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/businesses/[businessId]/hours
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const businessId = resolvedParams.businessId
    const body = await request.json()

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400 }
      )
    }

    const { hours } = body

    if (!Array.isArray(hours)) {
      return NextResponse.json(
        { success: false, error: 'Hours must be an array' },
        { status: 400 }
      )
    }

    // Validate and normalize hours format
    for (const hour of hours) {
      if (
        typeof hour.day_of_week !== 'number' ||
        hour.day_of_week < 0 ||
        hour.day_of_week > 6 ||
        typeof hour.is_active !== 'boolean'
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid hour format' },
          { status: 400 }
        )
      }

      if (hour.is_active) {
        if (!hour.open_time || !hour.close_time) {
          return NextResponse.json(
            { success: false, error: 'Open and close times are required for active days' },
            { status: 400 }
          )
        }

        // Normalize time format — ensure HH:MM
        const normalizeTime = (timeStr: string): string | null => {
          if (!timeStr) return null
          const cleanTime = timeStr.trim()

          const simpleTimeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/)
          if (simpleTimeMatch) {
            const h = parseInt(simpleTimeMatch[1])
            const m = parseInt(simpleTimeMatch[2])
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
            }
          }

          // Handle HHMM format without colon
          const normalized = cleanTime.includes(':')
            ? cleanTime
            : cleanTime.length === 4
              ? cleanTime.substring(0, 2) + ':' + cleanTime.substring(2)
              : cleanTime

          const timeMatch = normalized.match(/^(\d{1,2}):?(\d{2})?$/)
          if (!timeMatch) return null

          const h = parseInt(timeMatch[1])
          const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0

          if (h < 0 || h > 23 || m < 0 || m > 59) return null

          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        }

        const normalizedOpenTime = normalizeTime(hour.open_time)
        const normalizedCloseTime = normalizeTime(hour.close_time)

        if (!normalizedOpenTime || !normalizedCloseTime) {
          return NextResponse.json(
            { success: false, error: `Invalid time format for day ${hour.day_of_week}. Use HH:MM (e.g., 09:00, 17:30)` },
            { status: 400 }
          )
        }

        hour.open_time = normalizedOpenTime
        hour.close_time = normalizedCloseTime

        if (hour.open_time >= hour.close_time) {
          return NextResponse.json(
            { success: false, error: 'Close time must be after open time' },
            { status: 400 }
          )
        }
      } else {
        hour.open_time = hour.open_time || '09:00'
        hour.close_time = hour.close_time || '17:00'
      }
    }

    await updateBusinessHours(businessId, hours)

    return NextResponse.json({
      success: true,
      message: 'Business hours updated successfully'
    })

  } catch (error) {
    console.error('Error updating business hours:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
