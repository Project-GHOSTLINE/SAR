#!/usr/bin/env tsx

/**
 * Scanner qui génère le catalogue de toutes les routes API
 * Source de vérité pour API Explorer
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface ApiRoute {
  id: string;
  path: string;
  methods: string[];
  description: string;
  auth: string;
  input_schema?: string;
  output: number[];
  external_calls: string[];
  tables_touched: string[];
  fileRef: {
    file: string;
    lines: string;
  };
}

interface ApiCatalog {
  generated_at: string;
  total_routes: number;
  routes: ApiRoute[];
}

// Convertir path fichier -> path API
function filePathToApiPath(filePath: string): string {
  // src/app/api/contact/route.ts -> /api/contact
  const relative = filePath.replace('src/app', '').replace('/route.ts', '');
  // Convertir [param] -> :param
  return relative.replace(/\[([^\]]+)\]/g, ':$1');
}

// Générer ID stable depuis method + path
function generateRouteId(method: string, apiPath: string): string {
  const normalized = apiPath
    .replace(/^\/api\//, '')
    .replace(/\//g, '_')
    .replace(/:/g, '');
  return `${method.toLowerCase()}_${normalized}`;
}

// Extraire les méthodes HTTP du code
function extractMethods(content: string): string[] {
  const methods: string[] = [];
  if (/export\s+async\s+function\s+GET/m.test(content)) methods.push('GET');
  if (/export\s+async\s+function\s+POST/m.test(content)) methods.push('POST');
  if (/export\s+async\s+function\s+PUT/m.test(content)) methods.push('PUT');
  if (/export\s+async\s+function\s+PATCH/m.test(content)) methods.push('PATCH');
  if (/export\s+async\s+function\s+DELETE/m.test(content)) methods.push('DELETE');
  return methods;
}

// Extraire description depuis commentaires
function extractDescription(content: string): string {
  // Chercher commentaire de bloc en haut
  const blockComment = content.match(/\/\*\*?\s*\n\s*\*\s*([^\n]+)/);
  if (blockComment) return blockComment[1].trim();

  // Chercher commentaire ligne
  const lineComment = content.match(/^\/\/\s*([^\n]+)/m);
  if (lineComment) return lineComment[1].trim();

  return 'No description';
}

// Détecter auth
function detectAuth(content: string): string {
  if (/requireAuth|getServerSession|cookies\(\)\.get\(['"]auth/i.test(content)) {
    return 'session';
  }
  if (/bearer\s+token|authorization.*header/i.test(content)) {
    return 'bearer_token';
  }
  if (/api[_-]?key/i.test(content)) {
    return 'api_key';
  }
  if (/admin.*session|adminOnly|isAdmin/i.test(content)) {
    return 'admin_session';
  }
  return 'none';
}

// Extraire schemas Zod
function extractZodSchemas(content: string): string | undefined {
  const zodMatch = content.match(/z\.object\(\{[^}]+\}\)/);
  if (zodMatch) return zodMatch[0];
  return undefined;
}

// Extraire status codes
function extractStatusCodes(content: string): number[] {
  const codes = new Set<number>();
  const matches = content.matchAll(/NextResponse\.json\([^)]*,\s*\{\s*status:\s*(\d+)/g);
  for (const match of matches) {
    codes.add(parseInt(match[1]));
  }
  const statusMatches = content.matchAll(/return.*status[:\s]+(\d+)/gi);
  for (const match of statusMatches) {
    codes.add(parseInt(match[1]));
  }
  if (codes.size === 0) codes.add(200);
  return Array.from(codes).sort();
}

// Détecter external calls
function detectExternalCalls(content: string): string[] {
  const calls: string[] = [];
  if (/fetch\s*\(/i.test(content)) calls.push('fetch');
  if (/axios/i.test(content)) calls.push('axios');
  if (/vopay|vonigo|margill/i.test(content)) calls.push('external_api');
  if (/webhook/i.test(content)) calls.push('webhook');
  if (/email|sendgrid|resend/i.test(content)) calls.push('email');
  return [...new Set(calls)];
}

// Détecter tables Supabase touchées
function detectTables(content: string): string[] {
  const tables: string[] = [];
  const matches = content.matchAll(/\.from\(['"]([^'"]+)['"]\)/g);
  for (const match of matches) {
    tables.push(match[1]);
  }
  const rpcMatches = content.matchAll(/\.rpc\(['"]([^'"]+)['"]\)/g);
  for (const match of rpcMatches) {
    tables.push(`rpc:${match[1]}`);
  }
  return [...new Set(tables)];
}

async function scanApiRoutes(): Promise<ApiCatalog> {
  console.log('🔍 Scanning API routes...\n');

  const files = await glob('src/app/api/**/route.ts');
  const routes: ApiRoute[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const apiPath = filePathToApiPath(file);
    const methods = extractMethods(content);

    if (methods.length === 0) continue;

    const description = extractDescription(content);
    const auth = detectAuth(content);
    const input_schema = extractZodSchemas(content);
    const output = extractStatusCodes(content);
    const external_calls = detectExternalCalls(content);
    const tables_touched = detectTables(content);

    // Créer une route par méthode
    for (const method of methods) {
      const route: ApiRoute = {
        id: generateRouteId(method, apiPath),
        path: apiPath,
        methods: [method],
        description,
        auth,
        input_schema,
        output,
        external_calls,
        tables_touched,
        fileRef: {
          file: file.replace('src/app/', ''),
          lines: '1-N'
        }
      };

      routes.push(route);
    }

    console.log(`✓ ${apiPath} (${methods.join(', ')})`);
  }

  const catalog: ApiCatalog = {
    generated_at: new Date().toISOString(),
    total_routes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path))
  };

  console.log(`\n✅ Scanned ${files.length} files, found ${routes.length} routes\n`);

  return catalog;
}

async function main() {
  const catalog = await scanApiRoutes();

  // Créer le dossier si nécessaire
  const outputDir = path.join(process.cwd(), 'src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Sauvegarder le catalogue
  const outputPath = path.join(outputDir, 'api-catalog.generated.json');
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

  console.log(`📦 Catalog saved to: ${outputPath}`);
  console.log(`\n📊 Stats:`);
  console.log(`   - Total routes: ${catalog.total_routes}`);
  console.log(`   - With auth: ${catalog.routes.filter(r => r.auth !== 'none').length}`);
  console.log(`   - With external calls: ${catalog.routes.filter(r => r.external_calls.length > 0).length}`);
  console.log(`   - With DB access: ${catalog.routes.filter(r => r.tables_touched.length > 0).length}`);
}

main().catch(console.error);
