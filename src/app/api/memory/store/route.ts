// API: Stocker une nouvelle mémoire
// POST /api/memory/store

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      project_name,
      category,
      key,
      content,
      context,
      tags = [],
      importance = 5
    } = body;

    // Validation
    if (!project_name || !category || !key || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: project_name, category, key, content' },
        { status: 400 }
      );
    }

    // Upsert dans claude_memory
    const { data, error } = await supabase
      .from('claude_memory')
      .upsert({
        project_name,
        category,
        key,
        content,
        context,
        tags,
        importance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_name,category,key'
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to store memory', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Memory stored successfully',
      data
    });

  } catch (error: any) {
    console.error('Erreur dans /api/memory/store:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
