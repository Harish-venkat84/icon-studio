import { NextResponse, type NextRequest } from 'next/server'
import { USER_HEADER } from './lib/constants'

const encoder = new TextEncoder()

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function safeEqual(a: string, b: string) {
  const [left, right] = await Promise.all([digest(a), digest(b)])
  let difference = 0
  for (let index = 0; index < left.length; index++) difference |= left[index]! ^ right[index]!
  return difference === 0
}

function configuredUsers() {
  return (process.env.STUDIO_USERS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(':')
      return { name: entry.slice(0, separator), password: entry.slice(separator + 1) }
    })
    .filter((user) => user.name && user.password)
}

async function authenticate(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Basic ')) return null
  let decoded: string
  try {
    decoded = atob(header.slice(6))
  } catch {
    return null
  }
  const separator = decoded.indexOf(':')
  if (separator < 0) return null
  const name = decoded.slice(0, separator)
  const password = decoded.slice(separator + 1)

  let match: string | null = null
  for (const user of configuredUsers()) {
    const ok = (await safeEqual(user.name, name)) && (await safeEqual(user.password, password))
    if (ok) match = user.name
  }
  return match
}

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.delete(USER_HEADER)

  if (request.method !== 'GET' && request.headers.get('sec-fetch-site') === 'cross-site') {
    return new NextResponse('Cross-site requests are not allowed', { status: 403 })
  }

  if (configuredUsers().length === 0) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Studio login is not configured (set STUDIO_USERS)', { status: 503 })
    }
    headers.set(USER_HEADER, 'local-dev')
    return NextResponse.next({ request: { headers } })
  }

  const user = await authenticate(request)
  if (!user) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Icon Studio", charset="UTF-8"' },
    })
  }
  headers.set(USER_HEADER, user)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
