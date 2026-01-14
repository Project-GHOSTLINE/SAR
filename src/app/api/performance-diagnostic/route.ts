import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Read the HTML file from public directory
    const filePath = path.join(process.cwd(), 'public', 'performance-diagnostic.html')
    const htmlContent = fs.readFileSync(filePath, 'utf-8')

    // Return HTML with proper headers
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error serving performance diagnostic:', error)
    return new NextResponse('Performance diagnostic not found', { status: 404 })
  }
}
