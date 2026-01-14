// API: Enregistrer qu'un document a été lu
// POST /api/memory/doc-read

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_name,
      file_path,
      file_name,
      file_type,
      file_content,
      summary,
      key_points = [],
      sections = []
    } = body;

    // Validation
    if (!project_name || !file_path || !file_name) {
      return NextResponse.json(
        { error: 'Missing required fields: project_name, file_path, file_name' },
        { status: 400 }
      );
    }

    // Calculer le hash du fichier
    const file_hash = file_content
      ? crypto.createHash('sha256').update(file_content).digest('hex')
      : null;

    // Calculer les métadonnées
    const file_size = file_content ? Buffer.byteLength(file_content, 'utf8') : null;
    const lines_count = file_content ? file_content.split('\n').length : null;

    // Upsert dans claude_docs_read
    const { data, error } = await supabase
      .from('claude_docs_read')
      .upsert({
        project_name,
        file_path,
        file_name,
        file_type,
        file_hash,
        summary,
        key_points,
        sections,
        file_size,
        lines_count,
        read_at: new Date().toISOString(),
        needs_reread: false
      }, {
        onConflict: 'project_name,file_path'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to store doc read', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document read recorded successfully',
      data
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/doc-read:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Vérifier si un document a déjà été lu
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const project_name = searchParams.get('project');
    const file_path = searchParams.get('file_path');

    if (!project_name || !file_path) {
      return NextResponse.json(
        { error: 'Missing required parameters: project, file_path' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('claude_docs_read')
      .select('*')
      .eq('project_name', project_name)
      .eq('file_path', file_path)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to check doc read', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      already_read: !!data,
      data: data || null
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/doc-read:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
