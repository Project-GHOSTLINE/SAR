import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET!

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // Handle admin subdomain - rewrite all paths to /admin/*
  if (hostname.startsWith('admin.')) {
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.rewrite(url)
    }

    if (!pathname.startsWith('/admin') && !isApiRoute && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin' + pathname
      return NextResponse.rewrite(url)
    }
  }

  // Handle client subdomain - rewrite all paths to /client/*
  if (hostname.startsWith('client.')) {
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/client'
      return NextResponse.rewrite(url)
    }

    if (!pathname.startsWith('/client') && !isApiRoute && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone()
      url.pathname = '/client' + pathname
      return NextResponse.rewrite(url)
    }
  }

  // Protect admin routes (require authentication) - but NOT API routes
  const isAdminRoute = pathname.startsWith('/admin/') || (hostname.startsWith('admin.') && pathname !== '/' && pathname !== '/admin' && !isApiRoute)
  const isAdminLoginPage = pathname === '/admin' || (hostname.startsWith('admin.') && pathname === '/')

  if (isAdminRoute && !isAdminLoginPage) {
    const token = request.cookies.get('admin_token')?.value

    if (!token) {
      const loginUrl = hostname.startsWith('admin.') ? '/' : '/admin'
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL(hostname.startsWith('admin.') ? '/' : '/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
