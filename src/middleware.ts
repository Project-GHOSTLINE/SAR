import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'sar-admin-secret-key-2024'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // CHECK AUTHENTICATION FIRST - before any rewrite
  // Protect ALL admin pages except login page
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin'
  const isAdminSubdomainRoute = hostname.startsWith('admin.') &&
                                 pathname !== '/' &&
                                 !pathname.startsWith('/_next') &&
                                 !isApiRoute

  if (isAdminRoute || isAdminSubdomainRoute) {
    const token = request.cookies.get('admin-session')?.value

    if (!token) {
      const loginUrl = hostname.startsWith('admin.') ? '/' : '/admin'
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
    } catch {
      const response = NextResponse.redirect(new URL(hostname.startsWith('admin.') ? '/' : '/admin', request.url))
      response.cookies.delete('admin-session')
      return response
    }
  }

  // Handle admin subdomain rewrites AFTER auth check
  if (hostname.startsWith('admin.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/admin', request.url))
    }
    if (!pathname.startsWith('/admin') && !isApiRoute && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL('/admin' + pathname, request.url))
    }
  }

  // Handle client subdomain
  if (hostname.startsWith('client.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/client', request.url))
    }
    if (!pathname.startsWith('/client') && !isApiRoute && !pathname.startsWith('/_next')) {
      return NextResponse.rewrite(new URL('/client' + pathname, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|sw.js|manifest.json).*)']
}
