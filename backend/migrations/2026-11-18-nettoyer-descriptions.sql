-- Optionnel : nettoie en base les résumés importés d'AniList qui contiennent des balises HTML.
-- Le site les nettoie déjà à l'affichage ; ce script rend la base propre aussi.
-- À essayer d'abord sur une branche Neon, puis sur la production.

-- 1. Voir combien de fiches sont concernées
SELECT COUNT(*) FROM works WHERE description ~ '<[a-zA-Z/][^>]*>';

-- 2. Nettoyer : <br> → retour à la ligne, autres balises retirées
UPDATE works
SET description = NULLIF(btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(description, '<br\s*/?>', E'\n', 'gi'),
        '<[^>]*>', '', 'g'),
      E'\n{3,}', E'\n\n', 'g')
    ), '')
WHERE description ~ '<[a-zA-Z/][^>]*>';
