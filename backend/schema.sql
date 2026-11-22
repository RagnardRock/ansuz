-- ═══════════════════════════════════════════════════════════════════
-- Schéma actuel de la base Ansuz (relevé sur Neon le 2026-11-18).
-- Sert à recréer une base vide. Les anciennes migrations sont dans migrations/historique/.
-- Colonnes et types : relevés depuis information_schema.
-- Clés, contraintes UNIQUE et CHECK : déduites du code et des anciennes migrations
-- (à confirmer lors du passage de la base sur le VPS, avec pg_dump --schema-only).
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Utilisateurs ───────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  avatar_url    TEXT,
  is_admin      BOOLEAN      NOT NULL DEFAULT false,
  bio           TEXT
);

-- ─── Œuvres ─────────────────────────────────────────────────────────
-- type : 'book' | 'manga' | 'film' | 'series' | 'music' | 'game'
-- approved : false = en attente de validation admin (ajout manuel sans source CDN)
-- cdn_source : 'google_books' | 'anilist' | 'tmdb' | 'rawg' | 'itunes'… (d'où viennent les données)
CREATE TABLE works (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(255) NOT NULL,
  type         VARCHAR(20)  NOT NULL DEFAULT 'book',
  cover_url    TEXT,
  link         TEXT,
  created_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  author       TEXT,
  release_year INTEGER,
  description  TEXT,
  genres       TEXT[],
  page_count   INTEGER,
  publisher    TEXT,
  isbn         TEXT,
  language     TEXT,
  status       TEXT,
  volume_count INTEGER,
  origin       TEXT,
  duration     INTEGER,
  main_cast    TEXT[],
  season_count INTEGER,
  platforms    TEXT[],
  track_count  INTEGER,
  approved     BOOLEAN      DEFAULT true,
  cdn_source   TEXT
);

-- ─── Avis (un par utilisateur et par œuvre) ─────────────────────────
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

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Votes sur les avis ─────────────────────────────────────────────
CREATE TABLE upvotes (
  review_id  UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- ─── Abonnements (qui suit qui) ─────────────────────────────────────
CREATE TABLE follows (
  follower_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- ─── Limite des tentatives de connexion ─────────────────────────────
CREATE TABLE login_attempts (
  id           BIGSERIAL   PRIMARY KEY,
  ip           TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Suivi : statut et progression de chaque membre sur une œuvre ───
-- status : planned (à voir/lire), in_progress (en cours), completed (fini), dropped (abandonné)
-- progress : page (livre), tome (manga), épisode (série)
CREATE TABLE library (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id     UUID        NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'dropped')),
  progress    INTEGER     CHECK (progress >= 0),
  started_at  DATE,
  finished_at DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, work_id)
);

CREATE INDEX library_work_idx ON library (work_id);
CREATE INDEX library_user_status_idx ON library (user_id, status, updated_at DESC);

CREATE TRIGGER library_updated_at
  BEFORE UPDATE ON library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Réponses sous les avis ─────────────────────────────────────────
CREATE TABLE review_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX review_replies_review_idx ON review_replies (review_id, created_at);
