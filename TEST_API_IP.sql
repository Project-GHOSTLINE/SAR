-- ============================================================================
-- TEST API IP - Récupérer un IP hash pour tester
-- ============================================================================

-- 1️⃣ Récupérer un IP actif avec beaucoup d'activité
SELECT
  ip,
  total_requests,
  active_days,
  landing_page,
  device
FROM ip_to_seo_segment
ORDER BY total_requests DESC
LIMIT 5;

-- Copier un IP de la liste ci-dessus, puis tester:
-- curl "https://solutionargentrapide.ca/api/seo/ip/[IP_ICI]?range=30d"

-- ============================================================================
