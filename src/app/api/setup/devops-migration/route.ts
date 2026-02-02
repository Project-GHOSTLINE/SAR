import { NextResponse } from 'next/server'
import { Client } from 'pg'

const SQL_FIX = `
CREATE OR REPLACE FUNCTION get_devops_stats()
RETURNS TABLE(
  total_tasks BIGINT,
  todo_count BIGINT,
  in_progress_count BIGINT,
  blocked_count BIGINT,
  done_count BIGINT,
  urgent_count BIGINT,
  high_priority_count BIGINT,
  overdue_count BIGINT,
  completed_this_week BIGINT,
  tasks_by_department JSONB,
  tasks_by_layer JSONB,
  tasks_by_assignee JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'todo') as todo,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
      COUNT(*) FILTER (WHERE status = 'done') as done,
      COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
      COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'done') as overdue,
      COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days') as completed_week
    FROM devops_tasks
  ),
  dept_stats AS (
    SELECT department,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'todo') as todo,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'done') as done
    FROM devops_tasks
    GROUP BY department
  ),
  dept_json AS (
    SELECT jsonb_object_agg(
      department,
      jsonb_build_object(
        'total', total,
        'todo', todo,
        'in_progress', in_progress,
        'done', done
      )
    ) as by_dept
    FROM dept_stats
  ),
  layer_stats AS (
    SELECT infrastructure_layer,
      COUNT(*) as count
    FROM devops_tasks
    WHERE infrastructure_layer IS NOT NULL
    GROUP BY infrastructure_layer
  ),
  layer_json AS (
    SELECT jsonb_object_agg(
      infrastructure_layer,
      count
    ) as by_layer
    FROM layer_stats
  ),
  assignee_stats AS (
    SELECT COALESCE(assigned_to, 'Unassigned') as assignee,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'done') as done
    FROM devops_tasks
    GROUP BY assigned_to
  ),
  assignee_json AS (
    SELECT jsonb_object_agg(
      assignee,
      jsonb_build_object(
        'total', total,
        'in_progress', in_progress,
        'done', done
      )
    ) as by_assignee
    FROM assignee_stats
  )
  SELECT
    s.total,
    s.todo,
    s.in_progress,
    s.blocked,
    s.done,
    s.urgent,
    s.high_priority,
    s.overdue,
    s.completed_week,
    COALESCE(d.by_dept, '{}'::jsonb),
    COALESCE(l.by_layer, '{}'::jsonb),
    COALESCE(a.by_assignee, '{}'::jsonb)
  FROM stats s
  CROSS JOIN dept_json d
  CROSS JOIN layer_json l
  CROSS JOIN assignee_json a;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

export async function POST() {
  // Extract project ref from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  if (!projectRef) {
    return NextResponse.json({
      success: false,
      error: 'Could not extract project ref'
    }, { status: 500 })
  }

  // Try to connect with the database password from env
  const password = process.env.SUPABASE_DB_PASSWORD || 'postgres'

  try {
    const client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password,
      ssl: { rejectUnauthorized: false }
    })

    await client.connect()
    await client.query(SQL_FIX)

    // Test the function
    const result = await client.query('SELECT * FROM get_devops_stats()')

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully!',
      stats: result.rows[0]
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      sql: SQL_FIX,
      instructions: 'Please apply this SQL manually via Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/' + projectRef + '/sql'
    }, { status: 500 })
  }
}
