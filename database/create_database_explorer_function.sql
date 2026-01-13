-- ============================================================================
-- FONCTION POUR DATABASE EXPLORER
-- ============================================================================
-- Crée une fonction qui retourne toutes les tables avec leurs infos
-- ============================================================================

-- 1. Fonction pour obtenir toutes les tables avec comptage de lignes
CREATE OR REPLACE FUNCTION get_all_tables_with_info()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  column_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::TEXT,
    COALESCE(s.n_live_tup, 0) AS row_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
    ) AS column_count
  FROM information_schema.tables t
  LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = 'public'
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND NOT t.table_name LIKE '\_%' -- Exclure tables système commençant par _
    AND NOT t.table_name LIKE 'pg\_%' -- Exclure tables PostgreSQL
  ORDER BY COALESCE(s.n_live_tup, 0) DESC;
END;
$$;

-- 2. Fonction pour obtenir les colonnes d'une table spécifique
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable TEXT,
  column_default TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$;

-- 3. Donner les permissions d'exécution (déjà definer security, donc safe)
-- Ces fonctions sont SECURITY DEFINER, elles s'exécutent avec les permissions du créateur

-- Vérification
SELECT * FROM get_all_tables_with_info();
