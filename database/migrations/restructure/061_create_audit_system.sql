-- 061_create_audit_system.sql
-- Phase 6B: Audit Trail System
-- Date: 2026-01-15
-- Objectif: Tracer tous les changements sur tables critiques

-- ==============================================================================
-- TABLE AUDIT_LOG
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quelle table/opération
  table_name text NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  record_id uuid NOT NULL,

  -- Anciennes/nouvelles valeurs
  old_values jsonb NULL,
  new_values jsonb NULL,

  -- Métadonnées
  changed_by text NULL, -- Email ou user_id (via current_setting si configuré)
  changed_at timestamptz NOT NULL DEFAULT now(),

  -- Contexte additionnel (optionnel)
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS audit_log_table_name_idx ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS audit_log_record_id_idx ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS audit_log_changed_at_idx ON public.audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_operation_idx ON public.audit_log(operation);

COMMENT ON TABLE public.audit_log IS 'Audit trail de tous les changements sur tables critiques';

-- ==============================================================================
-- FONCTION TRIGGER AUDIT GÉNÉRIQUE
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  record_id_value uuid;
  changed_by_value text;
BEGIN
  -- Extraire l'ID du record (assume colonne 'id' de type uuid)
  IF TG_OP = 'DELETE' THEN
    record_id_value := OLD.id;
  ELSE
    record_id_value := NEW.id;
  END IF;

  -- Tenter de récupérer l'utilisateur actuel (via current_setting)
  -- Si configuré dans Next.js: SET LOCAL app.current_user = 'admin@example.com'
  BEGIN
    changed_by_value := current_setting('app.current_user', true);
  EXCEPTION
    WHEN OTHERS THEN
      changed_by_value := NULL;
  END;

  -- INSERT: Capturer nouvelles valeurs uniquement
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      'INSERT',
      record_id_value,
      NULL,
      to_jsonb(NEW),
      changed_by_value
    );
    RETURN NEW;

  -- UPDATE: Capturer anciennes + nouvelles valeurs
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      'UPDATE',
      record_id_value,
      to_jsonb(OLD),
      to_jsonb(NEW),
      changed_by_value
    );
    RETURN NEW;

  -- DELETE: Capturer anciennes valeurs uniquement
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      table_name,
      operation,
      record_id,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      TG_TABLE_NAME,
      'DELETE',
      record_id_value,
      to_jsonb(OLD),
      NULL,
      changed_by_value
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.audit_trigger_func IS 'Fonction trigger générique pour audit trail';

-- ==============================================================================
-- ACTIVER AUDIT SUR TABLES CRITIQUES
-- ==============================================================================

-- 1️⃣ CLIENTS (capture création, modification, suppression)
DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;
CREATE TRIGGER audit_clients_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 2️⃣ LOANS (capture tous changements de prêts)
DROP TRIGGER IF EXISTS audit_loans_trigger ON public.loans;
CREATE TRIGGER audit_loans_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3️⃣ PAYMENT_EVENTS (déjà événements, mais audit les modifications)
DROP TRIGGER IF EXISTS audit_payment_events_trigger ON public.payment_events;
CREATE TRIGGER audit_payment_events_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4️⃣ VOPAY_OBJECTS (capture modifications manuelles)
DROP TRIGGER IF EXISTS audit_vopay_objects_trigger ON public.vopay_objects;
CREATE TRIGGER audit_vopay_objects_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vopay_objects
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 5️⃣ COMMUNICATIONS (optionnel, peut générer beaucoup de logs)
-- Commenter si trop verbose
DROP TRIGGER IF EXISTS audit_communications_trigger ON public.communications;
CREATE TRIGGER audit_communications_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ==============================================================================
-- VUES UTILES POUR INSPECTION
-- ==============================================================================

-- Vue 1: Audit récent (derniers 1000 événements)
CREATE OR REPLACE VIEW public.vw_audit_recent AS
SELECT
  al.id,
  al.table_name,
  al.operation,
  al.record_id,
  al.changed_by,
  al.changed_at,
  -- Extraire infos clés selon la table
  CASE al.table_name
    WHEN 'clients' THEN al.new_values->>'primary_email'
    WHEN 'loans' THEN al.new_values->>'status'
    WHEN 'vopay_objects' THEN al.new_values->>'vopay_id'
    ELSE NULL
  END AS record_summary
FROM public.audit_log al
ORDER BY al.changed_at DESC
LIMIT 1000;

COMMENT ON VIEW vw_audit_recent IS 'Derniers 1000 événements audit pour monitoring';

-- Vue 2: Audit par table (stats)
CREATE OR REPLACE VIEW public.vw_audit_stats_by_table AS
SELECT
  table_name,
  operation,
  COUNT(*) as event_count,
  MIN(changed_at) as first_event,
  MAX(changed_at) as last_event,
  COUNT(DISTINCT changed_by) as unique_users
FROM public.audit_log
GROUP BY table_name, operation
ORDER BY table_name, operation;

COMMENT ON VIEW vw_audit_stats_by_table IS 'Statistiques audit par table et opération';

-- Vue 3: Audit d'un client spécifique (historique complet)
CREATE OR REPLACE FUNCTION public.get_client_audit_history(p_client_id uuid)
RETURNS TABLE (
  audit_id uuid,
  table_name text,
  operation text,
  changed_at timestamptz,
  changed_by text,
  old_values jsonb,
  new_values jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.table_name,
    al.operation,
    al.changed_at,
    al.changed_by,
    al.old_values,
    al.new_values
  FROM public.audit_log al
  WHERE al.record_id = p_client_id
     OR (al.table_name = 'loans' AND al.new_values->>'client_id' = p_client_id::text)
     OR (al.table_name = 'communications' AND al.new_values->>'client_id' = p_client_id::text)
  ORDER BY al.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_client_audit_history IS 'Récupère l''historique audit complet d''un client';

-- ==============================================================================
-- CLEANUP AUTOMATIQUE (optionnel)
-- ==============================================================================
-- Fonction pour supprimer logs > 1 an (exécuter via cron)

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_log
  WHERE changed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Supprime les logs audit plus vieux que X jours (défaut: 365)';

-- ==============================================================================
-- CONFIGURATION NEXT.JS (Instructions)
-- ==============================================================================

-- Pour tracer qui fait les changements depuis Next.js, ajouter dans vos routes API:
--
-- import { getSupabase } from '@/lib/supabase'
--
-- export async function POST(req: Request) {
--   const supabase = getSupabase()
--
--   // Configurer l'utilisateur actuel (avant les operations)
--   await supabase.rpc('set_config', {
--     config_param: 'app.current_user',
--     config_value: 'admin@example.com' // Ou JWT email
--   })
--
--   // Ensuite faire vos operations...
--   const { data } = await supabase.from('clients').insert({...})
--
--   // L'audit sera automatiquement enregistré avec changed_by = 'admin@example.com'
-- }

-- ==============================================================================
-- VALIDATION
-- ==============================================================================

DO $$
DECLARE
  triggers_count INTEGER;
  audit_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDATION AUDIT SYSTEM ===';

  -- Compter triggers créés
  SELECT COUNT(*)
  INTO triggers_count
  FROM pg_trigger
  WHERE tgname LIKE 'audit_%_trigger';

  RAISE NOTICE '✅ Audit triggers créés: %', triggers_count;

  -- Compter logs audit existants (si backfill ou tests)
  SELECT COUNT(*) INTO audit_count FROM public.audit_log;
  RAISE NOTICE '📊 Audit logs existants: %', audit_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Phase 6B Complete: Audit system ready!';
  RAISE NOTICE '';
  RAISE NOTICE '📌 NOTE: Pour tracer changed_by depuis Next.js:';
  RAISE NOTICE '   await supabase.rpc(''set_config'', {';
  RAISE NOTICE '     config_param: ''app.current_user'',';
  RAISE NOTICE '     config_value: user_email';
  RAISE NOTICE '   })';

END $$;
