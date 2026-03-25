// Authentication utilities for business admin sessions

export interface BusinessAdminUser {
  id: string
  businessId: string
  first_name: string
  last_name: string
  email: string
  businessName: string
}

// Set business admin session — signs a JWT server-side and stores it in a secure cookie
export async function setBusinessAdminSession(user: BusinessAdminUser): Promise<void> {
  // Request a signed JWT from the server
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })

  if (!response.ok) {
    throw new Error('Failed to create session')
  }

  const { token } = await response.json()

  // Store the JWT (signed) in localStorage for client-side reads
  localStorage.setItem('businessAdmin', token)

  // Set the JWT as a cookie for middleware authentication (7 days)
  const maxAge = 7 * 24 * 60 * 60
  document.cookie = `businessAdmin=${token}; path=/; max-age=${maxAge}; secure; samesite=strict`
}

// Parse the JWT payload from localStorage (no signature verification — that's done server-side)
// Returns the decoded user data for display purposes
export function getBusinessAdminSession(): BusinessAdminUser | null {
  try {
    const token = localStorage.getItem('businessAdmin')
    if (!token) return null

    // JWT structure: header.payload.signature — decode payload (base64url)
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

    if (payload.id && payload.businessId) {
      return {
        id: payload.id,
        businessId: payload.businessId,
        first_name: payload.first_name ?? '',
        last_name: payload.last_name ?? '',
        email: payload.email ?? '',
        businessName: payload.businessName ?? ''
      }
    }
  } catch (error) {
    console.error('Error parsing business admin session:', error)
  }
  return null
}

// Clear business admin session (localStorage + cookie)
export function clearBusinessAdminSession(): void {
  localStorage.removeItem('businessAdmin')
  document.cookie = 'businessAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// Check if user is authenticated
export function isBusinessAdminAuthenticated(): boolean {
  return getBusinessAdminSession() !== null
}

// Router interface for type safety
interface Router {
  push: (path: string) => void
}

// Get business by business name
async function getBusinessByName(businessName: string) {
  try {
    const response = await fetch(`/api/businesses/by-name/${encodeURIComponent(businessName)}`)
    const data = await response.json()
    if (data.success) {
      return data.business
    }
  } catch (error) {
    console.error('Error fetching business:', error)
  }
  return null
}

// Redirect to login if not authenticated or user doesn't belong to this business
export async function requireBusinessAdminAuth(businessName: string, router: Router): Promise<BusinessAdminUser | null> {
  const user = getBusinessAdminSession()
  if (!user) {
    clearBusinessAdminSession()
    router.push(`/${businessName}/login`)
    return null
  }

  // Validate that user belongs to this specific business
  const business = await getBusinessByName(businessName)
  if (!business || business.id !== user.businessId) {
    clearBusinessAdminSession()
    router.push(`/${businessName}/login`)
    return null
  }

  return user
}
