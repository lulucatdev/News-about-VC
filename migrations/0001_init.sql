CREATE TABLE IF NOT EXISTS articles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unique_id    TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  url          TEXT NOT NULL,
  source       TEXT NOT NULL,
  publish_time TEXT,
  summary      TEXT DEFAULT '',
  sector       TEXT DEFAULT '',
  crawl_time   TEXT NOT NULL,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_publish_time ON articles(publish_time);
CREATE INDEX IF NOT EXISTS idx_unique_id ON articles(unique_id);
