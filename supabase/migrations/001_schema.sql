-- ============================================================
-- CHAE WEBTOON PLATFORM - DATABASE SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'premium', 'moderator', 'admin');
CREATE TYPE webtoon_status AS ENUM ('ongoing', 'completed', 'hiatus', 'dropped');
CREATE TYPE webtoon_type AS ENUM ('webtoon', 'manga', 'manhwa', 'manhua');
CREATE TYPE age_rating AS ENUM ('all', 'teen', 'mature');
CREATE TYPE release_day AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');
CREATE TYPE notification_type AS ENUM ('new_chapter', 'comment_reply', 'comment_like', 'system', 'promotion');
CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'spoiler', 'harassment', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  role          user_role NOT NULL DEFAULT 'user',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_banned     BOOLEAN NOT NULL DEFAULT false,
  ban_reason    TEXT,
  banned_at     TIMESTAMPTZ,
  banned_until  TIMESTAMPTZ,
  coins         INTEGER NOT NULL DEFAULT 0,             -- for chapter unlocks
  total_views   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ============================================================
-- AUTHORS
-- ============================================================

CREATE TABLE authors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  social_links JSONB DEFAULT '{}',              -- {twitter, instagram, etc.}
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authors_slug ON authors(slug);
CREATE INDEX idx_authors_name ON authors USING gin(name gin_trgm_ops);

-- ============================================================
-- GENRES
-- ============================================================

CREATE TABLE genres (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6B7280',           -- hex color for UI badge
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_genres_slug ON genres(slug);

-- ============================================================
-- WEBTOONS
-- ============================================================

CREATE TABLE webtoons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  alternative_titles TEXT[],
  description     TEXT,
  cover_url       TEXT,                          -- S3 key
  banner_url      TEXT,                          -- S3 key
  author_id       UUID REFERENCES authors(id) ON DELETE SET NULL,
  artist_id       UUID REFERENCES authors(id) ON DELETE SET NULL,   -- can differ from author
  status          webtoon_status NOT NULL DEFAULT 'ongoing',
  type            webtoon_type NOT NULL DEFAULT 'webtoon',
  age_rating      age_rating NOT NULL DEFAULT 'all',
  release_day     release_day,
  is_premium      BOOLEAN NOT NULL DEFAULT false,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  view_count      BIGINT NOT NULL DEFAULT 0,
  bookmark_count  INTEGER NOT NULL DEFAULT 0,
  chapter_count   INTEGER NOT NULL DEFAULT 0,
  avg_rating      NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webtoons_slug ON webtoons(slug);
CREATE INDEX idx_webtoons_status ON webtoons(status);
CREATE INDEX idx_webtoons_published ON webtoons(is_published, published_at DESC);
CREATE INDEX idx_webtoons_featured ON webtoons(is_featured) WHERE is_featured = true;
CREATE INDEX idx_webtoons_author ON webtoons(author_id);
CREATE INDEX idx_webtoons_title ON webtoons USING gin(title gin_trgm_ops);

-- ============================================================
-- WEBTOON_GENRES (junction)
-- ============================================================

CREATE TABLE webtoon_genres (
  webtoon_id  UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  genre_id    UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (webtoon_id, genre_id)
);

-- ============================================================
-- CHAPTERS
-- ============================================================

CREATE TABLE chapters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webtoon_id      UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  chapter_number  NUMERIC(8,1) NOT NULL,        -- supports .5 for extras
  title           TEXT,
  slug            TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,                          -- S3 key
  is_premium      BOOLEAN NOT NULL DEFAULT false,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  view_count      BIGINT NOT NULL DEFAULT 0,
  like_count      INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  page_count      INTEGER NOT NULL DEFAULT 0,
  coin_cost       INTEGER NOT NULL DEFAULT 0,   -- coins needed if premium
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (webtoon_id, chapter_number),
  UNIQUE (webtoon_id, slug)
);

CREATE INDEX idx_chapters_webtoon ON chapters(webtoon_id, chapter_number);
CREATE INDEX idx_chapters_published ON chapters(webtoon_id, is_published, published_at DESC);

-- ============================================================
-- CHAPTER_PAGES
-- ============================================================

CREATE TABLE chapter_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url   TEXT NOT NULL,                    -- S3 key
  width       INTEGER,
  height      INTEGER,
  file_size   INTEGER,                          -- bytes
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chapter_id, page_number)
);

CREATE INDEX idx_pages_chapter ON chapter_pages(chapter_id, page_number);

-- ============================================================
-- FAVORITES (bookmarks)
-- ============================================================

CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  webtoon_id  UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  notify_new_chapter BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, webtoon_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_webtoon ON favorites(webtoon_id);

-- ============================================================
-- RATINGS
-- ============================================================

CREATE TABLE ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  webtoon_id  UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL CHECK (score >= 1 AND score <= 10),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, webtoon_id)
);

CREATE INDEX idx_ratings_webtoon ON ratings(webtoon_id);

-- ============================================================
-- COMMENTS (webtoon level)
-- ============================================================

CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  webtoon_id  UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- for replies
  content     TEXT NOT NULL,
  is_spoiler  BOOLEAN NOT NULL DEFAULT false,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  like_count  INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_webtoon ON comments(webtoon_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- ============================================================
-- CHAPTER_COMMENTS
-- ============================================================

CREATE TABLE chapter_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES chapter_comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_spoiler  BOOLEAN NOT NULL DEFAULT false,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  deleted_at  TIMESTAMPTZ,
  like_count  INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapter_comments_chapter ON chapter_comments(chapter_id, created_at DESC);
CREATE INDEX idx_chapter_comments_user ON chapter_comments(user_id);

-- ============================================================
-- COMMENT_LIKES
-- ============================================================

CREATE TABLE comment_likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);

-- ============================================================
-- CHAPTER_COMMENT_LIKES
-- ============================================================

CREATE TABLE chapter_comment_likes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_comment_id  UUID NOT NULL REFERENCES chapter_comments(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_comment_id)
);

CREATE INDEX idx_chapter_comment_likes ON chapter_comment_likes(chapter_comment_id);

-- ============================================================
-- CHAPTER_LIKES
-- ============================================================

CREATE TABLE chapter_likes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

CREATE INDEX idx_chapter_likes ON chapter_likes(chapter_id);

-- ============================================================
-- READING_HISTORY
-- ============================================================

CREATE TABLE reading_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  webtoon_id      UUID NOT NULL REFERENCES webtoons(id) ON DELETE CASCADE,
  chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  last_page       INTEGER NOT NULL DEFAULT 1,
  progress        NUMERIC(5,2) NOT NULL DEFAULT 0,  -- 0-100%
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

CREATE INDEX idx_reading_history_user ON reading_history(user_id, last_read_at DESC);
CREATE INDEX idx_reading_history_webtoon ON reading_history(user_id, webtoon_id, last_read_at DESC);

-- ============================================================
-- CHAPTER_UNLOCKS (premium coins)
-- ============================================================

CREATE TABLE chapter_unlocks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  coins_spent INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

CREATE INDEX idx_unlocks_user ON chapter_unlocks(user_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan          subscription_plan NOT NULL,
  status        subscription_status NOT NULL DEFAULT 'active',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  cancelled_at  TIMESTAMPTZ,
  payment_id    TEXT,                           -- external payment reference
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, created_at DESC);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, status) WHERE status = 'active';

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  data        JSONB DEFAULT '{}',              -- extra payload (webtoon_id, chapter_id, etc.)
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          report_reason NOT NULL,
  description     TEXT,
  status          report_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  -- polymorphic target (only one should be set)
  comment_id          UUID REFERENCES comments(id) ON DELETE CASCADE,
  chapter_comment_id  UUID REFERENCES chapter_comments(id) ON DELETE CASCADE,
  webtoon_id          UUID REFERENCES webtoons(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- ============================================================
-- COIN_TRANSACTIONS
-- ============================================================

CREATE TABLE coin_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,                -- positive = earned, negative = spent
  balance     INTEGER NOT NULL,                -- balance after transaction
  reason      TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coin_tx_user ON coin_transactions(user_id, created_at DESC);

-- ============================================================
-- SITE_SETTINGS (key-value config)
-- ============================================================

CREATE TABLE site_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Default settings
INSERT INTO site_settings (key, value, description) VALUES
  ('site_name', '"Chae"', 'Site display name'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('registration_enabled', 'true', 'Allow new user registration'),
  ('free_chapter_limit', '3', 'Free chapters per day for non-premium'),
  ('coin_per_chapter', '5', 'Default coins to unlock a chapter');
