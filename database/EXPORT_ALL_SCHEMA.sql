-- ============================================================================
-- EXPORT COMPLET DU SCHÉMA - TOUT EN UNE REQUÊTE
-- ============================================================================
-- Copiez ce résultat et collez-le dans le chat
-- ============================================================================

WITH table_info AS (
  SELECT
    t.table_name,
    (
      SELECT json_agg(
        json_build_object(
          'column', c.column_name,
          'type', c.data_type,
          'nullable', c.is_nullable,
          'default', c.column_default
        ) ORDER BY c.ordinal_position
      )
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = t.table_name
    ) as columns,
    (
      SELECT n_live_tup
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname = t.table_name
    ) as row_count
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name
)
SELECT json_agg(
  json_build_object(
    'table', table_name,
    'rows', COALESCE(row_count, 0),
    'columns', columns
  ) ORDER BY table_name
) as complete_schema
FROM table_info;
