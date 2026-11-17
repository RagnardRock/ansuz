-- Passage des notes entières (SMALLINT) aux demi-étoiles (NUMERIC 0.5..5)
ALTER TABLE posts ALTER COLUMN rating TYPE NUMERIC(2,1);
ALTER TABLE posts ADD CONSTRAINT posts_rating_check CHECK (rating >= 0.5 AND rating <= 5);

-- Système d'upvotes
CREATE TABLE upvotes (
  post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Rate-limiting du login
CREATE TABLE login_attempts (
  id           BIGSERIAL   PRIMARY KEY,
  ip           TEXT        NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
