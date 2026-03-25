import { NextResponse } from 'next/server'

// Standardized API response helpers

export function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}

export function fail(error: string | object, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}
