-- ============================================
-- Verify Tables Exist and Expose via API
-- ============================================

-- Check if tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('loan_applications', 'loan_objectives', 'cortex_rules', 'cortex_execution_logs')
ORDER BY tablename;

-- Check if functions exist
SELECT
  proname as function_name,
  pronargs as num_args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('generate_loan_reference', 'update_updated_at_column');

-- Show all public tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Enable RLS (if it's blocking)
ALTER TABLE IF EXISTS loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loan_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cortex_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cortex_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role
DROP POLICY IF EXISTS "Enable all for service role" ON loan_applications;
CREATE POLICY "Enable all for service role" ON loan_applications
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for service role" ON loan_objectives;
CREATE POLICY "Enable all for service role" ON loan_objectives
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for service role" ON cortex_rules;
CREATE POLICY "Enable all for service role" ON cortex_rules
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for service role" ON cortex_execution_logs;
CREATE POLICY "Enable all for service role" ON cortex_execution_logs
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify we can query the tables
SELECT 'loan_applications' as table_name, COUNT(*) as row_count FROM loan_applications
UNION ALL
SELECT 'loan_objectives', COUNT(*) FROM loan_objectives
UNION ALL
SELECT 'cortex_rules', COUNT(*) FROM cortex_rules
UNION ALL
SELECT 'cortex_execution_logs', COUNT(*) FROM cortex_execution_logs;
