// API: Route Discovery & Analysis
// Scans all API routes in the project and extracts their metadata
// GET /api/routes/discover - Discover all routes with full analysis
// POST /api/routes/discover - Test a specific route

import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

interface RouteInfo {
  path: string;
  file_path: string;
  methods: string[];
  description?: string;
  parameters?: string[];
  requires_auth?: boolean;
  category: string;
  last_modified?: string;
}

export async function GET(request: NextRequest) {
  try {
    const routes = await discoverAllRoutes();

    // Categorize routes
    const categorized = categorizeRoutes(routes);

    // Calculate stats
    const stats = {
      total_routes: routes.length,
      total_endpoints: routes.reduce((sum, r) => sum + r.methods.length, 0),
      categories: Object.keys(categorized).length,
      breakdown: Object.entries(categorized).map(([cat, rts]) => ({
        category: cat,
        count: (rts as RouteInfo[]).length
      }))
    };

    return NextResponse.json({
      success: true,
      stats,
      routes,
      categorized
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path, method, body, headers } = await request.json();

    // Test the route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      test_result: {
        status: response.status,
        ok: response.ok,
        data
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function discoverAllRoutes(): Promise<RouteInfo[]> {
  const apiDir = join(process.cwd(), 'src', 'app', 'api');
  const routes: RouteInfo[] = [];

  async function scanDir(dir: string, basePath: string = '/api') {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recurse into subdirectories
          const newPath = `${basePath}/${entry.name}`;
          await scanDir(fullPath, newPath);
        } else if (entry.name === 'route.ts') {
          // Found a route file
          const routePath = basePath;
          const routeInfo = await analyzeRoute(fullPath, routePath);
          routes.push(routeInfo);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await scanDir(apiDir);
  return routes;
}

async function analyzeRoute(filePath: string, routePath: string): Promise<RouteInfo> {
  const content = await readFile(filePath, 'utf-8');

  // Extract methods (GET, POST, PUT, DELETE, PATCH)
  const methods: string[] = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PATCH')) methods.push('PATCH');

  // Extract description from comments
  const descMatch = content.match(/\/\/ API: (.+)/);
  const description = descMatch ? descMatch[1] : undefined;

  // Extract parameters from searchParams
  const paramMatches = content.matchAll(/searchParams\.get\(['"](.+?)['"]\)/g);
  const parameters = Array.from(paramMatches, m => m[1]);

  // Check if requires auth
  const requires_auth = content.includes('SUPABASE_SERVICE') ||
                       content.includes('auth.role()') ||
                       content.includes('session');

  // Determine category
  const category = determineCategory(routePath);

  return {
    path: routePath,
    file_path: filePath,
    methods,
    description,
    parameters: parameters.length > 0 ? parameters : undefined,
    requires_auth,
    category
  };
}

function categorizeRoutes(routes: RouteInfo[]): Record<string, RouteInfo[]> {
  const categorized: Record<string, RouteInfo[]> = {};

  for (const route of routes) {
    if (!categorized[route.category]) {
      categorized[route.category] = [];
    }
    categorized[route.category].push(route);
  }

  return categorized;
}

function determineCategory(path: string): string {
  if (path.includes('/admin/')) return 'Admin';
  if (path.includes('/sentinel/')) return 'Sentinel';
  if (path.includes('/memory/')) return 'Memory';
  if (path.includes('/activity/')) return 'Activity';
  if (path.includes('/webhooks/')) return 'Webhooks';
  if (path.includes('/vopay/')) return 'VoPay';
  if (path.includes('/osint/')) return 'OSINT';
  if (path.includes('/download/')) return 'Downloads';
  if (path.includes('/applications/')) return 'Applications';
  if (path.includes('/contact')) return 'Contact';
  return 'Other';
}
