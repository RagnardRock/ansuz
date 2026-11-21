-- ═══════════════════════════════════════════════════════════════════
-- Fusion des œuvres en double : ÉTAPE 3 (à lancer APRÈS 2026-11-21-fusion-doublons-1-reperer.sql
-- et après avoir relu la table fusion_doublons).
-- ═══════════════════════════════════════════════════════════════════

-- ─── ÉTAPE 3 : fusionner ────────────────────────────────────────────
-- Tout se fait dans une transaction : en cas d'erreur, rien n'est modifié.
BEGIN;

-- 3a. Si un même membre a un avis sur les deux fiches, on garde celui de la fiche gardée,
--     sauf s'il est vide et que l'autre a un texte : on recopie alors note et texte.
UPDATE reviews g
SET rating      = COALESCE(g.rating, r.rating),
    description = COALESCE(NULLIF(g.description, ''), r.description)
FROM fusion_doublons f
JOIN reviews r ON r.work_id = f.retirer
WHERE g.work_id = f.garder AND g.user_id = r.user_id;

-- 3b. Les votes de l'avis en double passent sur l'avis gardé (sans compter deux fois un même votant).
INSERT INTO upvotes (review_id, user_id, created_at)
SELECT g.id, u.user_id, u.created_at
FROM fusion_doublons f
JOIN reviews r ON r.work_id = f.retirer
JOIN reviews g ON g.work_id = f.garder AND g.user_id = r.user_id
JOIN upvotes u ON u.review_id = r.id
ON CONFLICT DO NOTHING;

-- 3c. Les avis sans conflit sont déplacés sur la fiche gardée.
UPDATE reviews r
SET work_id = f.garder
FROM fusion_doublons f
WHERE r.work_id = f.retirer
  AND NOT EXISTS (SELECT 1 FROM reviews g WHERE g.work_id = f.garder AND g.user_id = r.user_id);

-- 3d. La fiche en double est supprimée (ses avis restants, déjà fusionnés en 3a/3b, partent avec).
DELETE FROM works w USING fusion_doublons f WHERE w.id = f.retirer;

-- Vérification : doit afficher 0
SELECT count(*) AS fiches_restantes_a_retirer FROM works WHERE id IN (SELECT retirer FROM fusion_doublons);

COMMIT;

DROP TABLE fusion_doublons;
