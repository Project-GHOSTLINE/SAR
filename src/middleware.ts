import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || '56K2TFqsBtHQjzihmTS8palyJeA3KZHI1yYsvGEkxWQ='

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin/dashboard and other admin routes (not /admin login page)
  if (pathname.startsWith('/admin/') && pathname !== '/admin') {
    const token = request.cookies.get('admin_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch {
      // Invalid or expired token
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
