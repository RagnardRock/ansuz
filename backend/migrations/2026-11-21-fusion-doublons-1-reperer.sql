-- ═══════════════════════════════════════════════════════════════════
-- Fusion des œuvres en double
--
-- L'import du 11 juin 2026 a créé de nouvelles fiches (avec pochette et résumé
-- venant de Google Books, AniList, TMDB…) à côté de fiches ajoutées à la main,
-- qui gardent les avis. Exemples : « Frieren » / « Frieren: Beyond Journey’s End »,
-- « dragon ball » / « Dragon Ball ».
--
-- Deux fichiers, à lancer l'un après l'autre dans l'éditeur SQL de Neon
-- (ou avec psql sur le VPS). Essayez d'abord sur une branche Neon de test.
--   Ce fichier (1-reperer)   : étapes 1 et 2, ne modifie aucune œuvre ni aucun avis.
--   2026-11-21-fusion-doublons-2-fusionner.sql : étape 3.
--
--   ÉTAPE 1 : repère les doublons dans une table fusion_doublons (ne modifie rien d'autre)
--   ÉTAPE 2 : vous relisez la liste et supprimez les lignes qui ne sont PAS des doublons
--   ÉTAPE 3 : fusionne (avis et votes déplacés sur la fiche gardée, l'autre fiche supprimée)
-- ═══════════════════════════════════════════════════════════════════


-- ─── ÉTAPE 1 : repérer ──────────────────────────────────────────────
-- Deux œuvres du même type sont considérées en double si leurs années de sortie
-- ne se contredisent pas (égales, ou l'une des deux inconnue) et si :
--   a) leurs titres sont identiques en ignorant majuscules, accents et ponctuation
--      (« dragon ball » = « Dragon Ball »), ou
--   b) une fiche ajoutée à la main (sans source CDN) a un titre court qui est le début
--      du titre d'une fiche importée, suivi de « : » ou « - »
--      (« Frieren » → « Frieren: Beyond Journey’s End »).
--      Deux fiches importées ne sont jamais rapprochées ainsi : « Avengers » et
--      « Avengers : Endgame » sont deux films différents.
-- Les titres sans lettre latine (japonais, hindi…) ne sont rapprochés que s'ils sont identiques.
-- On garde la fiche la plus complète : venue d'un CDN, avec pochette, puis la plus ancienne.

DROP TABLE IF EXISTS fusion_doublons;

CREATE TABLE fusion_doublons AS
WITH norm AS (
  SELECT
    id, type, title, cdn_source, cover_url, description, created_at, release_year,
    lower(title) AS titre_min,
    btrim(regexp_replace(
      translate(lower(title),
        'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ’',
        'aaaaaaceeeeiiiinooooouuuuyyoa'''),
      '[^a-z0-9]+', ' ', 'g')) AS cle
  FROM works
),
paires AS (
  SELECT a.id AS id_a, b.id AS id_b
  FROM norm a
  JOIN norm b ON a.type = b.type AND a.id < b.id
  WHERE (a.release_year IS NULL OR b.release_year IS NULL OR a.release_year = b.release_year)
    AND (
      (a.cle = b.cle AND (a.cle ~ '[a-z]' OR a.titre_min = b.titre_min))
      OR (a.cdn_source IS NULL AND b.cdn_source IS NOT NULL AND a.cle ~ '[a-z]'
          AND length(a.titre_min) < length(b.titre_min)
          AND left(b.titre_min, length(a.titre_min)) = a.titre_min
          AND substr(b.titre_min, length(a.titre_min) + 1) ~ '^\s*[:\-–—]')
      OR (b.cdn_source IS NULL AND a.cdn_source IS NOT NULL AND b.cle ~ '[a-z]'
          AND length(b.titre_min) < length(a.titre_min)
          AND left(a.titre_min, length(b.titre_min)) = b.titre_min
          AND substr(a.titre_min, length(b.titre_min) + 1) ~ '^\s*[:\-–—]')
    )
),
-- Pour chaque paire : laquelle garder ?
choix AS (
  SELECT
    p.*,
    CASE WHEN (a.cdn_source IS NOT NULL, a.cover_url IS NOT NULL, b.created_at > a.created_at)
            >= (b.cdn_source IS NOT NULL, b.cover_url IS NOT NULL, a.created_at > b.created_at)
         THEN a.id ELSE b.id END AS garder
  FROM paires p
  JOIN norm a ON a.id = p.id_a
  JOIN norm b ON b.id = p.id_b
),
lignes AS (
  SELECT garder, CASE WHEN garder = id_a THEN id_b ELSE id_a END AS retirer FROM choix
)
-- Une fiche n'est retirée qu'une fois, et une fiche gardée n'est jamais retirée ailleurs.
SELECT DISTINCT ON (l.retirer)
  l.retirer, l.garder,
  wr.type,
  wr.title AS titre_retire,
  wg.title AS titre_garde,
  (SELECT count(*) FROM reviews WHERE work_id = l.retirer)::int AS avis_retire,
  (SELECT count(*) FROM reviews WHERE work_id = l.garder)::int  AS avis_garde
FROM lignes l
JOIN works wr ON wr.id = l.retirer
JOIN works wg ON wg.id = l.garder
WHERE l.garder NOT IN (SELECT retirer FROM lignes)
ORDER BY l.retirer, wg.cdn_source IS NOT NULL DESC, wg.created_at;


-- ─── ÉTAPE 2 : relire ───────────────────────────────────────────────
-- Affiche la liste. Chaque ligne = « titre_retire » sera fusionné dans « titre_garde ».
SELECT type, titre_retire, avis_retire, '→' AS " ", titre_garde, avis_garde, retirer
FROM fusion_doublons
ORDER BY type, titre_garde;

-- Si une ligne n'est pas un vrai doublon, supprimez-la avant l'étape 3, par exemple :
--   DELETE FROM fusion_doublons WHERE retirer = 'uuid-de-la-colonne-retirer';
