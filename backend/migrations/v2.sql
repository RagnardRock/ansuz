-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION V2 — À exécuter sur la branche dev Neon
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Évolution de la table users ─────────────────────────────────
-- avatar_url : photo de profil via URL CDN choisie par l'utilisateur
-- is_admin   : flag de modération, false par défaut pour tous
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;


-- ─── 2. Table works (les œuvres) ────────────────────────────────────
-- Une œuvre est une entité indépendante des avis.
-- created_by peut devenir NULL si le créateur supprime son compte
-- (ON DELETE SET NULL) — l'œuvre survit, elle perd juste son créateur.
-- type : 'book' | 'manga' | 'film' | 'music' | 'game'
CREATE TABLE works (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(255) NOT NULL,
  type        VARCHAR(20)  NOT NULL DEFAULT 'book',
  cover_url   TEXT,
  link        TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ─── 3. Table reviews (les avis) ────────────────────────────────────
-- Un avis lie un utilisateur à une œuvre.
-- UNIQUE (work_id, user_id) : un seul avis par utilisateur par œuvre.
-- Cascade : si l'œuvre ou l'utilisateur est supprimé, l'avis l'est aussi.
CREATE TABLE reviews (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id     UUID         NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      NUMERIC(2,1) CHECK (rating >= 0.5 AND rating <= 5),
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (work_id, user_id)
);

-- Trigger updated_at sur reviews (même logique que posts)
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── 4. Migration des données existantes ────────────────────────────
-- Chaque post devient une work + un review.
-- On utilise une colonne temporaire _post_id pour garder le lien
-- entre le post source et la work créée, afin de construire les reviews.

ALTER TABLE works ADD COLUMN _post_id UUID;

INSERT INTO works (title, type, cover_url, link, created_by, created_at, _post_id)
SELECT title, 'book', cover_url, link, user_id, created_at, id
FROM posts;

INSERT INTO reviews (work_id, user_id, rating, description, created_at, updated_at)
SELECT w.id, p.user_id, p.rating, p.description, p.created_at, p.updated_at
FROM works w
JOIN posts p ON p.id = w._post_id;

ALTER TABLE works DROP COLUMN _post_id;


-- ─── 5. Table upvotes — migration vers review_id ────────────────────
-- Les upvotes portaient sur des posts, ils portent désormais sur des reviews.
-- Les anciens upvotes sont perdus (pas de mapping fiable post→review à ce stade).
DROP TABLE upvotes;

CREATE TABLE upvotes (
  review_id  UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);


-- ─── 6. Suppression de l'ancienne table posts ────────────────────────
DROP TABLE posts;




