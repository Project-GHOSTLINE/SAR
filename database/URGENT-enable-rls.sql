-- ============================================
-- URGENT: ENABLE RLS ON ALL PUBLIC TABLES
-- Security Fix - 25 tables exposed without RLS
-- ============================================

-- Enable RLS on all affected tables
ALTER TABLE public.bank_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payschedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payschedule_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preteur_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gambling_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsf_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capacity_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_category_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedro_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: Service Role Only (No Public Access)
-- ============================================

-- Bank data - Service role only
CREATE POLICY "Service role only" ON public.bank_verifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.bank_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.bank_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Contact data - Service role only
CREATE POLICY "Service role only" ON public.contacts
  FOR ALL USING (auth.role() = 'service_role');

-- Statistics - Service role only
CREATE POLICY "Service role only" ON public.account_statistics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.quarterly_statistics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.monthly_summaries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.monthly_category_stats
  FOR ALL USING (auth.role() = 'service_role');

-- Payment schedules - Service role only
CREATE POLICY "Service role only" ON public.payschedules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.payschedule_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Financial transactions - Service role only
CREATE POLICY "Service role only" ON public.preteur_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.gambling_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.nsf_fees
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.revenue_sources
  FOR ALL USING (auth.role() = 'service_role');

-- Analysis & Risk - Service role only
CREATE POLICY "Service role only" ON public.capacity_analysis
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.debt_summary
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.risk_scores
  FOR ALL USING (auth.role() = 'service_role');

-- ML Models - Service role only
CREATE POLICY "Service role only" ON public.ml_predictions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.ml_model_performance
  FOR ALL USING (auth.role() = 'service_role');

-- Reports & Documents - Service role only
CREATE POLICY "Service role only" ON public.reports_archive
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.pdf_statements
  FOR ALL USING (auth.role() = 'service_role');

-- Logs - Service role only
CREATE POLICY "Service role only" ON public.audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.processing_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role only" ON public.pedro_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'bank_verifications', 'bank_transactions', 'contacts', 'bank_accounts',
    'account_statistics', 'quarterly_statistics', 'payschedules',
    'payschedule_payments', 'preteur_transactions', 'gambling_transactions',
    'nsf_fees', 'revenue_sources', 'capacity_analysis', 'debt_summary',
    'risk_scores', 'ml_predictions', 'ml_model_performance',
    'monthly_summaries', 'monthly_category_stats', 'reports_archive',
    'pdf_statements', 'audit_logs', 'processing_logs', 'pedro_logs'
  )
ORDER BY tablename;

-- Count policies per table
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'bank_verifications', 'bank_transactions', 'contacts', 'bank_accounts',
    'account_statistics', 'quarterly_statistics', 'payschedules',
    'payschedule_payments', 'preteur_transactions', 'gambling_transactions',
    'nsf_fees', 'revenue_sources', 'capacity_analysis', 'debt_summary',
    'risk_scores', 'ml_predictions', 'ml_model_performance',
    'monthly_summaries', 'monthly_category_stats', 'reports_archive',
    'pdf_statements', 'audit_logs', 'processing_logs', 'pedro_logs'
  )
ORDER BY tablename, policyname;
