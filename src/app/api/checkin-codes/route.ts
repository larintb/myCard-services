import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Generar código de check-in
export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: 'Appointment ID is required'
      }, { status: 400 })
    }

    // Verificar que la cita existe
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_date, appointment_time, status')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      console.error('Appointment not found. Error:', appointmentError)
      return NextResponse.json({
        success: false,
        error: `Appointment not found. Details: ${appointmentError?.message || 'Unknown error'}`
      }, { status: 404 })
    }

    // Verificar que la cita es de hoy o en el futuro cercano (próximos 7 días)
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + 7)
    const maxDateString = maxDate.toISOString().split('T')[0]

    if (appointment.appointment_date < todayString) {
      return NextResponse.json({
        success: false,
        error: 'Cannot generate check-in codes for past appointments'
      }, { status: 400 })
    }

    if (appointment.appointment_date > maxDateString) {
      return NextResponse.json({
        success: false,
        error: 'Check-in codes can only be generated for appointments within the next 7 days'
      }, { status: 400 })
    }

    // Verificar si ya existe un código válido para esta cita
    const { data: existingCode } = await supabaseAdmin
      .from('checkin_codes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    if (existingCode) {
      return NextResponse.json({
        success: true,
        code: existingCode.code,
        expiresAt: existingCode.expires_at
      })
    }

    // Generar nuevo código de 6 dígitos
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    // Expiración en 30 minutos
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    // Insertar código en la base de datos
    const { data: newCode, error: insertError } = await supabaseAdmin
      .from('checkin_codes')
      .insert({
        appointment_id: appointmentId,
        code: code,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting check-in code:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to generate check-in code'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      code: newCode.code,
      expiresAt: newCode.expires_at
    })

  } catch (error) {
    console.error('Error in check-in code generation:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Verificar código de check-in
export async function PUT(request: NextRequest) {
  try {
    const { code, businessId } = await request.json()

    if (!code || !businessId) {
      return NextResponse.json({
        success: false,
        error: 'Code and business ID are required'
      }, { status: 400 })
    }

    // Buscar el código válido
    const { data: checkinCode, error: codeError } = await supabaseAdmin
      .from('checkin_codes')
      .select(`
        *,
        appointments!inner (
          id,
          appointment_date,
          appointment_time,
          status,
          business_id,
          users!inner (
            first_name,
            last_name,
            phone
          ),
          services!inner (
            name,
            price,
            duration_minutes
          )
        )
      `)
      .eq('code', code.toUpperCase())
      .eq('appointments.business_id', businessId)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    if (codeError || !checkinCode) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired check-in code'
      }, { status: 404 })
    }

    // Verificar que la cita no sea del pasado
    const today = new Date().toISOString().split('T')[0]
    if (checkinCode.appointments.appointment_date < today) {
      return NextResponse.json({
        success: false,
        error: 'This code is for a past appointment and cannot be used'
      }, { status: 400 })
    }

    // Marcar el código como usado
    const { error: updateCodeError } = await supabaseAdmin
      .from('checkin_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', checkinCode.id)

    if (updateCodeError) {
      console.error('Error marking code as used:', updateCodeError)
      return NextResponse.json({
        success: false,
        error: 'Failed to process check-in'
      }, { status: 500 })
    }

    // Determinar el siguiente estado de la cita
    const currentStatus = checkinCode.appointments.status
    const nextStatus = currentStatus === 'pending' ? 'confirmed' : 'completed'

    // Actualizar el estado de la cita
    const { error: updateAppointmentError } = await supabaseAdmin
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', checkinCode.appointments.id)

    if (updateAppointmentError) {
      console.error('Error updating appointment status:', updateAppointmentError)
      return NextResponse.json({
        success: false,
        error: 'Failed to update appointment status'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: checkinCode.appointments.id,
        client: `${checkinCode.appointments.users.first_name} ${checkinCode.appointments.users.last_name}`,
        service: checkinCode.appointments.services.name,
        time: checkinCode.appointments.appointment_time,
        previousStatus: currentStatus,
        newStatus: nextStatus,
        phone: checkinCode.appointments.users.phone
      }
    })

  } catch (error) {
    console.error('Error in check-in code verification:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}