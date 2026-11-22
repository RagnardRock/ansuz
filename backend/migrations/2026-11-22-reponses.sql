-- ═══════════════════════════════════════════════════════════════════
-- Réponses sous les avis.
-- À lancer une fois (Neon : éditeur SQL ; VPS : psql -d ansuz -f ce-fichier).
-- Sans risque : crée seulement une nouvelle table, ne touche à rien d'existant.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS review_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID        NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_replies_review_idx ON review_replies (review_id, created_at);
