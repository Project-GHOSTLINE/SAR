// API: Route Expansion & Generation
// Create new API routes dynamically with full control
// POST /api/routes/expand - Generate a new route based on specifications

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface RouteSpec {
  path: string; // e.g., "/api/analytics/metrics"
  methods: string[]; // ['GET', 'POST']
  description: string;
  parameters?: { name: string; type: string; required: boolean }[];
  requires_auth?: boolean;
  database_table?: string;
  response_type?: 'json' | 'text' | 'file';
}

export async function POST(request: NextRequest) {
  try {
    const spec: RouteSpec = await request.json();

    // Validate spec
    if (!spec.path || !spec.methods || spec.methods.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: path, methods' },
        { status: 400 }
      );
    }

    // Generate route code
    const code = generateRouteCode(spec);

    // Determine file path
    const routePath = spec.path.replace('/api/', '');
    const filePath = join(process.cwd(), 'src', 'app', 'api', routePath, 'route.ts');
    const dirPath = join(process.cwd(), 'src', 'app', 'api', routePath);

    // Create directory
    await mkdir(dirPath, { recursive: true });

    // Write file
    await writeFile(filePath, code, 'utf-8');

    // Log activity
    try {
      await fetch('http://localhost:3001/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'sar',
          action_type: 'create_route',
          target: spec.path,
          thought: `Created new route: ${spec.path} with methods: ${spec.methods.join(', ')}`,
          status: 'success'
        })
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({
      success: true,
      route: {
        path: spec.path,
        file_path: filePath,
        methods: spec.methods,
        code_preview: code.slice(0, 500) + '...'
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function generateRouteCode(spec: RouteSpec): string {
  const imports = generateImports(spec);
  const methods = spec.methods.map(m => generateMethod(m, spec)).join('\n\n');

  return `${imports}

${methods}
`;
}

function generateImports(spec: RouteSpec): string {
  let imports = `// API: ${spec.description}\n`;
  imports += `// Generated on: ${new Date().toISOString()}\n\n`;
  imports += `import { NextRequest, NextResponse } from 'next/server';\n`;

  if (spec.requires_auth || spec.database_table) {
    imports += `import { createClient } from '@supabase/supabase-js';\n\n`;
    imports += `const supabase = createClient(\n`;
    imports += `  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n`;
    imports += `  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!\n`;
    imports += `);\n`;
  }

  return imports;
}

function generateMethod(method: string, spec: RouteSpec): string {
  switch (method) {
    case 'GET':
      return generateGETMethod(spec);
    case 'POST':
      return generatePOSTMethod(spec);
    case 'PUT':
      return generatePUTMethod(spec);
    case 'DELETE':
      return generateDELETEMethod(spec);
    case 'PATCH':
      return generatePATCHMethod(spec);
    default:
      return '';
  }
}

function generateGETMethod(spec: RouteSpec): string {
  const params = spec.parameters || [];
  const hasParams = params.length > 0;

  let code = `export async function GET(request: NextRequest) {
  try {`;

  if (hasParams) {
    code += `
    const { searchParams } = new URL(request.url);`;

    params.forEach(p => {
      code += `
    const ${p.name} = searchParams.get('${p.name}');`;
    });

    // Add validation for required params
    const requiredParams = params.filter(p => p.required);
    if (requiredParams.length > 0) {
      code += `

    // Validation`;
      requiredParams.forEach(p => {
        code += `
    if (!${p.name}) {
      return NextResponse.json(
        { error: 'Missing required parameter: ${p.name}' },
        { status: 400 }
      );
    }`;
      });
    }
  }

  if (spec.database_table) {
    code += `

    // Query database
    const { data, error } = await supabase
      .from('${spec.database_table}')
      .select('*')`;

    // Add filters for parameters
    if (hasParams) {
      params.forEach(p => {
        if (p.required) {
          code += `
      .eq('${p.name}', ${p.name})`;
        }
      });
    }

    code += `;

    if (error) {
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });`;
  } else {
    code += `

    // TODO: Implement your logic here
    const result = {
      message: 'Route working',
      timestamp: new Date().toISOString()`;

    if (hasParams) {
      code += `,
      parameters: { ${params.map(p => p.name).join(', ')} }`;
    }

    code += `
    };

    return NextResponse.json({
      success: true,
      ...result
    });`;
  }

  code += `

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}`;

  return code;
}

function generatePOSTMethod(spec: RouteSpec): string {
  let code = `export async function POST(request: NextRequest) {
  try {
    const body = await request.json();`;

  if (spec.database_table) {
    code += `

    // Insert into database
    const { data, error } = await supabase
      .from('${spec.database_table}')
      .insert(body)
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Database insert failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    });`;
  } else {
    code += `

    // TODO: Implement your logic here
    const result = {
      message: 'Data received',
      received: body,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      ...result
    });`;
  }

  code += `

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}`;

  return code;
}

function generatePUTMethod(spec: RouteSpec): string {
  return `export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    ${spec.database_table ? `
    // Update database
    const { data, error } = await supabase
      .from('${spec.database_table}')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Database update failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    });` : `
    // TODO: Implement your update logic here
    return NextResponse.json({
      success: true,
      message: 'Update received',
      id,
      updates
    });`}

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}`;
}

function generateDELETEMethod(spec: RouteSpec): string {
  return `export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    ${spec.database_table ? `
    // Delete from database
    const { error } = await supabase
      .from('${spec.database_table}')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Database delete failed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully',
      id
    });` : `
    // TODO: Implement your delete logic here
    return NextResponse.json({
      success: true,
      message: 'Delete received',
      id
    });`}

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}`;
}

function generatePATCHMethod(spec: RouteSpec): string {
  return generatePUTMethod(spec).replace('PUT', 'PATCH');
}
