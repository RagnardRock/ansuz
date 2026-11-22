-- ═══════════════════════════════════════════════════════════════════
-- Suivi des œuvres : statut (à voir/lire, en cours, fini, abandonné) et progression.
-- À lancer une fois (Neon : éditeur SQL ; VPS : psql -d ansuz -f ce-fichier).
-- Sans risque : crée seulement une nouvelle table, ne touche à rien d'existant.
-- ═══════════════════════════════════════════════════════════════════

-- Mise à jour automatique de updated_at (déjà présente si la base vient de schema.sql)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS library (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id     UUID        NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  -- planned = à voir / à lire, in_progress = en cours, completed = fini, dropped = abandonné
  status      TEXT        NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'dropped')),
  -- Où j'en suis : page (livre), tome (manga), épisode (série). NULL pour les autres types.
  progress    INTEGER     CHECK (progress >= 0),
  started_at  DATE,
  finished_at DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS library_work_idx ON library (work_id);
CREATE INDEX IF NOT EXISTS library_user_status_idx ON library (user_id, status, updated_at DESC);

DROP TRIGGER IF EXISTS library_updated_at ON library;
CREATE TRIGGER library_updated_at
  BEFORE UPDATE ON library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
