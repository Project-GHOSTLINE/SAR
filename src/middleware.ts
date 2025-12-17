import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || '56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ='

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // Handle admin subdomain - rewrite all paths to /admin/*
  if (hostname.startsWith('admin.')) {
    // Root of admin subdomain -> show login page
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.rewrite(url)
    }

    // /dashboard on admin subdomain -> /admin/dashboard
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin' + pathname
      return NextResponse.rewrite(url)
    }
  }

  // Protect admin routes (require authentication)
  const isAdminRoute = pathname.startsWith('/admin/') || (hostname.startsWith('admin.') && pathname !== '/' && pathname !== '/admin')
  const isLoginPage = pathname === '/admin' || (hostname.startsWith('admin.') && pathname === '/')

  if (isAdminRoute && !isLoginPage) {
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
