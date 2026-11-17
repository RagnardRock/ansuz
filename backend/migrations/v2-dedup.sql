-- ═══════════════════════════════════════════════════════════════════
-- DÉDUPLICATION — œuvres au même titre (casse différente)
-- À exécuter sur la branche dev Neon après v2.sql
-- ═══════════════════════════════════════════════════════════════════

-- Étape 1 : table temporaire avec l'œuvre canonique par groupe (la plus ancienne)
CREATE TEMP TABLE dedup AS
SELECT
  w.id,
  LOWER(w.title) AS normalized_key,
  FIRST_VALUE(w.id) OVER (
    PARTITION BY LOWER(w.title)
    ORDER BY w.created_at ASC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS canonical_id
FROM works w
WHERE LOWER(w.title) IN (
  SELECT LOWER(title) FROM works GROUP BY LOWER(title) HAVING COUNT(*) > 1
);

-- Étape 2 : déplacer les avis des doublons vers l'œuvre canonique
-- (on ignore les conflits : si l'utilisateur a déjà un avis sur le canonique, on le laisse)
UPDATE reviews
SET work_id = d.canonical_id
FROM dedup d
WHERE reviews.work_id = d.id
  AND d.id != d.canonical_id
  AND NOT EXISTS (
    SELECT 1 FROM reviews r2
    WHERE r2.work_id = d.canonical_id
      AND r2.user_id = reviews.user_id
  );

-- Étape 3 : supprimer les avis qui n'ont pas pu être déplacés (conflit utilisateur)
DELETE FROM reviews
USING dedup d
WHERE reviews.work_id = d.id
  AND d.id != d.canonical_id;

-- Étape 4 : supprimer les œuvres en double (CASCADE nettoie upvotes résiduels)
DELETE FROM works
USING dedup d
WHERE works.id = d.id
  AND d.id != d.canonical_id;

DROP TABLE dedup;
