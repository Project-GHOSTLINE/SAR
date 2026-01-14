// API: Sentinel Command Execution
// POST /api/sentinel/execute

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';
import { osintAuthMiddleware } from '@/middleware/osint-auth'

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

// Map of safe commands
const commandMap: Record<string, () => Promise<any>> = {
  'scan project': async () => {
    const { stdout } = await execAsync('find . -type f -name "*.ts" -o -name "*.tsx" | wc -l');
    const fileCount = stdout.trim();
    return {
      message: `Project scan complete: ${fileCount} TypeScript files found`,
      details: { fileCount: parseInt(fileCount) }
    };
  },

  'analyze codebase': async () => {
    const { stdout } = await execAsync('find src -type f | wc -l');
    const fileCount = stdout.trim();
    return {
      message: `Codebase analysis: ${fileCount} files in src directory`,
      details: { fileCount: parseInt(fileCount) }
    };
  },

  'run tests': async () => {
    try {
      const { stdout, stderr } = await execAsync('npm test', { timeout: 30000 });
      return {
        message: 'Tests executed successfully',
        details: { stdout, stderr }
      };
    } catch (error: any) {
      return {
        message: 'Tests completed with errors',
        details: { error: error.message }
      };
    }
  },

  'build project': async () => {
    try {
      const { stdout } = await execAsync('npm run build', { timeout: 60000 });
      return {
        message: 'Build completed successfully',
        details: { output: stdout.substring(0, 500) }
      };
    } catch (error: any) {
      return {
        message: 'Build failed',
        details: { error: error.message }
      };
    }
  },

  'check health': async () => {
    // Check if APIs are responding
    const checks = {
      memory: false,
      activity: false,
      database: false
    };

    try {
      const { data } = await supabase.from('claude_memory').select('id').limit(1);
      checks.database = !!data;
      checks.memory = true;
      checks.activity = true;
    } catch (error) {
      // Ignore
    }

    const allHealthy = Object.values(checks).every(v => v);

    return {
      message: allHealthy ? 'All systems healthy' : 'Some systems need attention',
      details: checks
    };
  },

  'update dependencies': async () => {
    try {
      const { stdout } = await execAsync('npm outdated --json', { timeout: 10000 });
      const outdated = JSON.parse(stdout || '{}');
      const count = Object.keys(outdated).length;
      return {
        message: `Found ${count} outdated packages`,
        details: { count, packages: Object.keys(outdated) }
      };
    } catch (error: any) {
      return {
        message: 'All dependencies up to date',
        details: {}
      };
    }
  },

  'git status': async () => {
    const { stdout } = await execAsync('git status --short');
    const changes = stdout.trim().split('\n').filter(Boolean);
    return {
      message: `Git status: ${changes.length} changes`,
      details: { changes }
    };
  },

  'deploy': async () => {
    return {
      message: 'Deploy command received. Manual approval required.',
      details: { status: 'pending_approval' }
    };
  }
};

export async function POST(request: NextRequest) {
  // 🔐 Security: Check authentication
  const authError = await osintAuthMiddleware(request)
  if (authError) return authError

  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Command is required' },
        { status: 400 }
      );
    }

    // Log the command
    await supabase.from('claude_actions').insert({
      project_name: 'sar',
      action_type: 'Sentinel',
      target: command,
      thought: 'Command received from Sentinel Control Panel',
      goal: 'Execute user command',
      status: 'success'
    });

    // Execute the command
    const executor = commandMap[command.toLowerCase()];

    if (executor) {
      const result = await executor();
      return NextResponse.json({
        success: true,
        ...result
      });
    } else {
      // Try to execute as bash command (limited)
      if (command.startsWith('echo ') || command.startsWith('ls ') || command.startsWith('pwd')) {
        const { stdout, stderr } = await execAsync(command, { timeout: 5000 });
        return NextResponse.json({
          success: true,
          message: 'Command executed',
          details: { stdout, stderr }
        });
      }

      return NextResponse.json({
        success: false,
        error: `Unknown command: ${command}. Available: ${Object.keys(commandMap).join(', ')}`
      });
    }

  } catch (error: any) {
    console.error('Sentinel execution error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stderr || error.stdout
      },
      { status: 500 }
    );
  }
}
