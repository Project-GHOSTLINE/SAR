-- ============================================
-- SAFE RLS ENABLER
-- Active RLS uniquement sur les tables qui EXISTENT
-- ============================================

DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Pour chaque table publique sans RLS
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND rowsecurity = false
    LOOP
        -- Activer RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);

        -- Créer policy "Service role only" si elle n'existe pas
        BEGIN
            EXECUTE format('
                CREATE POLICY "Service role only" ON public.%I
                FOR ALL USING (auth.role() = ''service_role'')
            ', table_record.tablename);
        EXCEPTION
            WHEN duplicate_object THEN
                -- Policy existe déjà, ignorer
                NULL;
        END;

        RAISE NOTICE 'RLS activé sur: %', table_record.tablename;
    END LOOP;
END $$;

-- Vérification finale
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ Protégé'
    ELSE '❌ EXPOSÉ'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Compter les policies
SELECT
  COUNT(*) as total_policies_created
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'Service role only';
