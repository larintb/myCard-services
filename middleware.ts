import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'mycard-jwt-secret-change-this-in-production-min-32-chars'
)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and auth pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/' ||
    pathname.startsWith('/a/admin') ||
    pathname.startsWith('/c/') ||
    pathname.includes('/login')
  ) {
    return NextResponse.next()
  }

  // Check if it's a business admin route (format: /[businessname]/...)
  const businessRouteMatch = pathname.match(/^\/([^/]+)\/(dashboard|services|appointments|clients|hours|settings|reports)/)

  if (businessRouteMatch) {
    const businessName = businessRouteMatch[1]
    const authCookie = request.cookies.get('businessAdmin')

    if (!authCookie?.value) {
      const loginUrl = new URL(`/${businessName}/login`, request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Verify JWT signature — rejects forged or tampered cookies
    try {
      const { payload } = await jwtVerify(authCookie.value, secret)

      if (!payload.businessId || !payload.id) {
        throw new Error('Invalid payload')
      }
    } catch {
      const loginUrl = new URL(`/${businessName}/login`, request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('businessAdmin')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
