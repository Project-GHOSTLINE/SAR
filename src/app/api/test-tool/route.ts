// API: Test des outils Claude
// POST /api/test-tool

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, action, target, command, pattern, content } = body;

    let result: any = {
      success: true,
      tool,
      action,
      timestamp: new Date().toISOString()
    };

    switch (tool) {
      case 'Read':
        try {
          const filePath = join(process.cwd(), target);
          const fileContent = await readFile(filePath, 'utf-8');
          result.message = `Fichier lu avec succès: ${target}`;
          result.lines = fileContent.split('\n').length;
          result.size = fileContent.length;
          result.preview = fileContent.substring(0, 200) + '...';
        } catch (error: any) {
          throw new Error(`Impossible de lire ${target}: ${error.message}`);
        }
        break;

      case 'Write':
        try {
          const tempDir = join(process.cwd(), 'temp');
          await mkdir(tempDir, { recursive: true });
          const filePath = join(tempDir, target);
          await writeFile(filePath, content || 'Test content', 'utf-8');
          result.message = `Fichier créé: ${target}`;
          result.path = filePath;
        } catch (error: any) {
          throw new Error(`Impossible de créer ${target}: ${error.message}`);
        }
        break;

      case 'Bash':
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            timeout: 5000
          });
          result.message = 'Commande exécutée avec succès';
          result.stdout = stdout.trim();
          result.stderr = stderr.trim();
        } catch (error: any) {
          throw new Error(`Erreur commande: ${error.message}`);
        }
        break;

      case 'Glob':
        try {
          const { stdout } = await execAsync(`find . -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.next/*" | head -20`, {
            cwd: process.cwd(),
            timeout: 5000
          });
          const files = stdout.trim().split('\n').filter(Boolean);
          result.message = `${files.length} fichier(s) trouvé(s)`;
          result.count = files.length;
          result.files = files;
        } catch (error: any) {
          throw new Error(`Erreur glob: ${error.message}`);
        }
        break;

      case 'Grep':
        try {
          // Simulation de grep - dans un vrai cas j'utiliserais ripgrep
          const { stdout } = await execAsync(`grep -r "${pattern}" --include="*.ts" --include="*.tsx" --include="*.js" . | head -10`, {
            cwd: process.cwd(),
            timeout: 5000
          });
          const matches = stdout.trim().split('\n').filter(Boolean);
          result.message = `${matches.length} occurrence(s) trouvée(s)`;
          result.count = matches.length;
          result.matches = matches.slice(0, 5);
        } catch (error: any) {
          // Grep retourne code 1 si rien trouvé
          if (error.code === 1) {
            result.message = 'Aucune occurrence trouvée';
            result.count = 0;
            result.matches = [];
          } else {
            throw new Error(`Erreur grep: ${error.message}`);
          }
        }
        break;

      default:
        result.message = `Outil ${tool} reconnu mais test non implémenté`;
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Erreur test-tool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        tool: request.body ? (await request.json()).tool : 'unknown'
      },
      { status: 500 }
    );
  }
}
