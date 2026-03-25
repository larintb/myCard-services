import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    appointmentId: string
  }>
}

// POST /api/appointments/[appointmentId]/checkin - Generate check-in code
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const appointmentId = resolvedParams.appointmentId

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    // Verify appointment exists and is confirmed
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, status, appointment_date, appointment_time')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    if (appointment.status !== 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'Only confirmed appointments can generate check-in codes' },
        { status: 400 }
      )
    }

    // Check if appointment is today
    const today = new Date().toISOString().split('T')[0]
    if (appointment.appointment_date !== today) {
      return NextResponse.json(
        { success: false, error: 'Check-in codes can only be generated on the day of the appointment' },
        { status: 400 }
      )
    }

    // Check if there's already an active check-in code
    const { data: existingCode, error: codeError } = await supabaseAdmin
      .from('checkin_codes')
      .select('code, expires_at, used_at')
      .eq('appointment_id', appointmentId)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    if (existingCode && !codeError) {
      return NextResponse.json({
        success: true,
        code: existingCode.code,
        expires_at: existingCode.expires_at,
        message: 'Active check-in code already exists'
      })
    }

    // Generate new 6-digit check-in code
    const generateCode = () => {
      return Math.floor(100000 + Math.random() * 900000).toString()
    }

    let code = generateCode()
    let isUnique = false
    let attempts = 0

    // Ensure code is unique
    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('checkin_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) {
        isUnique = true
      } else {
        code = generateCode()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique code' },
        { status: 500 }
      )
    }

    // Code expires in 30 minutes
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    // Insert check-in code
    const { data: checkinCode, error: insertError } = await supabaseAdmin
      .from('checkin_codes')
      .insert({
        appointment_id: appointmentId,
        code,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating check-in code:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to create check-in code' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      code: checkinCode.code,
      expires_at: checkinCode.expires_at
    })

  } catch (error) {
    console.error('Error generating check-in code:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/appointments/[appointmentId]/checkin - Process check-in with code
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const appointmentId = resolvedParams.appointmentId
    const body = await request.json()
    const { code } = body

    if (!appointmentId || !code) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID and code are required' },
        { status: 400 }
      )
    }

    // Verify check-in code
    const { data: checkinCode, error: codeError } = await supabaseAdmin
      .from('checkin_codes')
      .select('id, expires_at, used_at')
      .eq('appointment_id', appointmentId)
      .eq('code', code)
      .single()

    if (codeError || !checkinCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in code' },
        { status: 400 }
      )
    }

    if (checkinCode.used_at) {
      return NextResponse.json(
        { success: false, error: 'Check-in code has already been used' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(checkinCode.expires_at)) {
      return NextResponse.json(
        { success: false, error: 'Check-in code has expired' },
        { status: 400 }
      )
    }

    // Mark code as used
    const { error: updateCodeError } = await supabaseAdmin
      .from('checkin_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', checkinCode.id)

    if (updateCodeError) {
      console.error('Error updating check-in code:', updateCodeError)
      return NextResponse.json(
        { success: false, error: 'Failed to process check-in' },
        { status: 500 }
      )
    }

    // Update appointment status to completed (checked in)
    const { error: updateAppointmentError } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId)

    if (updateAppointmentError) {
      console.error('Error updating appointment status:', updateAppointmentError)
      return NextResponse.json(
        { success: false, error: 'Failed to update appointment status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful'
    })

  } catch (error) {
    console.error('Error processing check-in:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}