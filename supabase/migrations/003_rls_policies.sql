-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE webtoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE webtoon_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone can read public profiles
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (is_active = true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Cannot self-escalate role
    AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Admins can update any profile (including role changes)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Insert is handled by trigger only (on auth.users creation)
CREATE POLICY "profiles_insert_trigger" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- AUTHORS
-- ============================================================

-- Public read
CREATE POLICY "authors_select_public" ON authors
  FOR SELECT USING (is_active = true);

-- Staff can see all (including inactive)
CREATE POLICY "authors_select_staff" ON authors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Only admins/moderators can insert/update/delete
CREATE POLICY "authors_insert_staff" ON authors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "authors_update_staff" ON authors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "authors_delete_admin" ON authors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- GENRES
-- ============================================================

CREATE POLICY "genres_select_public" ON genres FOR SELECT USING (true);

CREATE POLICY "genres_insert_staff" ON genres
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "genres_update_staff" ON genres
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "genres_delete_admin" ON genres
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- WEBTOONS
-- ============================================================

-- Published webtoons visible to all
CREATE POLICY "webtoons_select_published" ON webtoons
  FOR SELECT USING (is_published = true);

-- Staff sees all webtoons
CREATE POLICY "webtoons_select_staff" ON webtoons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "webtoons_insert_staff" ON webtoons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "webtoons_update_staff" ON webtoons
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "webtoons_delete_admin" ON webtoons
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- WEBTOON_GENRES
-- ============================================================

CREATE POLICY "webtoon_genres_select_public" ON webtoon_genres FOR SELECT USING (true);

CREATE POLICY "webtoon_genres_modify_staff" ON webtoon_genres
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- CHAPTERS
-- ============================================================

-- Published non-premium chapters visible to all
CREATE POLICY "chapters_select_free" ON chapters
  FOR SELECT USING (
    is_published = true AND is_premium = false
  );

-- Published premium chapters visible to premium users
CREATE POLICY "chapters_select_premium" ON chapters
  FOR SELECT USING (
    is_published = true AND is_premium = true
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('premium', 'admin', 'moderator')
    )
  );

-- OR user has unlocked the chapter
CREATE POLICY "chapters_select_unlocked" ON chapters
  FOR SELECT USING (
    is_published = true AND is_premium = true
    AND EXISTS (
      SELECT 1 FROM chapter_unlocks WHERE user_id = auth.uid() AND chapter_id = chapters.id
    )
  );

-- Staff sees all chapters
CREATE POLICY "chapters_select_staff" ON chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "chapters_insert_staff" ON chapters
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "chapters_update_staff" ON chapters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "chapters_delete_admin" ON chapters
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- CHAPTER_PAGES
-- ============================================================

-- Pages visible if user can read the chapter (same logic)
CREATE POLICY "pages_select_public" ON chapter_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapters c
      WHERE c.id = chapter_pages.chapter_id
        AND c.is_published = true
        AND (
          c.is_premium = false
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('premium', 'admin', 'moderator'))
          OR EXISTS (SELECT 1 FROM chapter_unlocks WHERE user_id = auth.uid() AND chapter_id = c.id)
        )
    )
  );

CREATE POLICY "pages_insert_staff" ON chapter_pages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "pages_delete_admin" ON chapter_pages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- FAVORITES
-- ============================================================

-- Users see only their own favorites
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "favorites_update_own" ON favorites
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can see all favorites
CREATE POLICY "favorites_select_admin" ON favorites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- RATINGS
-- ============================================================

-- Public aggregate read (used for avg display)
CREATE POLICY "ratings_select_public" ON ratings FOR SELECT USING (true);

CREATE POLICY "ratings_insert_auth" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "ratings_update_own" ON ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ratings_delete_own" ON ratings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================

-- Anyone can read non-deleted comments
CREATE POLICY "comments_select_public" ON comments
  FOR SELECT USING (is_deleted = false);

-- Authenticated users can insert
CREATE POLICY "comments_insert_auth" ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_banned = true AND (banned_until IS NULL OR banned_until > NOW())))
  );

-- Users can update their own (content only, soft-delete)
CREATE POLICY "comments_update_own" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Moderators/admins can update any
CREATE POLICY "comments_update_staff" ON comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- Hard delete only by admin
CREATE POLICY "comments_delete_admin" ON comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- CHAPTER_COMMENTS (same pattern as comments)
-- ============================================================

CREATE POLICY "chapter_comments_select_public" ON chapter_comments
  FOR SELECT USING (is_deleted = false);

CREATE POLICY "chapter_comments_insert_auth" ON chapter_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_banned = true AND (banned_until IS NULL OR banned_until > NOW())))
  );

CREATE POLICY "chapter_comments_update_own" ON chapter_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "chapter_comments_update_staff" ON chapter_comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "chapter_comments_delete_admin" ON chapter_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- COMMENT_LIKES
-- ============================================================

CREATE POLICY "comment_likes_select_public" ON comment_likes FOR SELECT USING (true);

CREATE POLICY "comment_likes_insert_auth" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "comment_likes_delete_own" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAPTER_COMMENT_LIKES
-- ============================================================

CREATE POLICY "cc_likes_select_public" ON chapter_comment_likes FOR SELECT USING (true);

CREATE POLICY "cc_likes_insert_auth" ON chapter_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "cc_likes_delete_own" ON chapter_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAPTER_LIKES
-- ============================================================

CREATE POLICY "chapter_likes_select_public" ON chapter_likes FOR SELECT USING (true);

CREATE POLICY "chapter_likes_insert_auth" ON chapter_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "chapter_likes_delete_own" ON chapter_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- READING_HISTORY
-- ============================================================

CREATE POLICY "reading_history_select_own" ON reading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reading_history_insert_own" ON reading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "reading_history_update_own" ON reading_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reading_history_delete_own" ON reading_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CHAPTER_UNLOCKS
-- ============================================================

CREATE POLICY "unlocks_select_own" ON chapter_unlocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "unlocks_insert_own" ON chapter_unlocks
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Admin can see all
CREATE POLICY "unlocks_select_admin" ON chapter_unlocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system/admin can insert subscriptions (not users directly)
CREATE POLICY "subscriptions_insert_admin" ON subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "subscriptions_update_admin" ON subscriptions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "subscriptions_select_admin" ON subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_admin" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- REPORTS
-- ============================================================

-- Users can create reports
CREATE POLICY "reports_insert_auth" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND auth.uid() IS NOT NULL);

-- Users can see their own reports
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Staff sees all reports
CREATE POLICY "reports_select_staff" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

CREATE POLICY "reports_update_staff" ON reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ============================================================
-- COIN_TRANSACTIONS
-- ============================================================

CREATE POLICY "coins_select_own" ON coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "coins_insert_admin" ON coin_transactions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "coins_select_admin" ON coin_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SITE_SETTINGS
-- ============================================================

-- Anyone can read settings
CREATE POLICY "settings_select_public" ON site_settings FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "settings_modify_admin" ON site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
