import crypto from 'crypto'
import { cookies } from 'next/headers'

function getSecretKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PORTAL_PASSWORD
  if (!secret) {
    throw new Error('FATAL: Neither ADMIN_SESSION_SECRET nor ADMIN_PORTAL_PASSWORD is set in environment.')
  }
  return secret
}

export function signAdminToken(): string {
  const secret = getSecretKey()
  const payload = {
    role: 'admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    nonce: crypto.randomBytes(8).toString('hex'),
  }

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadStr)
    .digest('base64url')

  return `${payloadStr}.${signature}`
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [payloadStr, signature] = parts
  const secret = getSecretKey()

  try {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('base64url')

    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSig)

    if (sigBuf.length !== expectedBuf.length) {
      return false
    }

    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'))
    if (!payload || typeof payload.exp !== 'number') {
      return false
    }

    if (payload.exp < Date.now()) {
      return false // Expired
    }

    return payload.role === 'admin'
  } catch (err) {
    return false
  }
}

export async function isRequestAuthorizedAdmin(req?: Request): Promise<boolean> {
  // 1. Check cookies
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_session')?.value
    if (token && verifyAdminToken(token)) {
      return true
    }
  } catch (err) {
    // If called where cookies() is unavailable, continue to header checks
  }

  // 2. Check Authorization header
  if (req) {
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim()
      if (verifyAdminToken(bearerToken)) {
        return true
      }
    }
  }

  return false
}
