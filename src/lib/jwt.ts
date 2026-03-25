import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'mycard-jwt-secret-change-this-in-production-min-32-chars'
)

export interface SessionPayload {
  id: string
  businessId: string
  first_name: string
  last_name: string
  email: string
  businessName: string
}

const SEVEN_DAYS = '7d'

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SEVEN_DAYS)
    .sign(secret)
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
