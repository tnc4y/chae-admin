-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_authors_updated_at BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_webtoons_updated_at BEFORE UPDATE ON webtoons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chapter_comments_updated_at BEFORE UPDATE ON chapter_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ratings_updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
BEGIN
  generated_username := 'user_' || substr(NEW.id::text, 1, 8);

  -- If email-based signup, use email prefix if available
  IF NEW.email IS NOT NULL THEN
    generated_username := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  INSERT INTO profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    generated_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', generated_username),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Webtoon rating recalculation
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_webtoon_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE webtoons
  SET
    avg_rating   = (SELECT COALESCE(AVG(score), 0) FROM ratings WHERE webtoon_id = COALESCE(NEW.webtoon_id, OLD.webtoon_id)),
    rating_count = (SELECT COUNT(*) FROM ratings WHERE webtoon_id = COALESCE(NEW.webtoon_id, OLD.webtoon_id))
  WHERE id = COALESCE(NEW.webtoon_id, OLD.webtoon_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_rating
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION recalculate_webtoon_rating();

-- ============================================================
-- Webtoon bookmark count
-- ============================================================

CREATE OR REPLACE FUNCTION update_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE webtoons SET bookmark_count = bookmark_count + 1 WHERE id = NEW.webtoon_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE webtoons SET bookmark_count = GREATEST(0, bookmark_count - 1) WHERE id = OLD.webtoon_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_bookmark_count();

-- ============================================================
-- Chapter count on webtoon
-- ============================================================

CREATE OR REPLACE FUNCTION update_chapter_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE webtoons SET chapter_count = chapter_count + 1 WHERE id = NEW.webtoon_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE webtoons SET chapter_count = GREATEST(0, chapter_count - 1) WHERE id = OLD.webtoon_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chapter_count
  AFTER INSERT OR DELETE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_chapter_count();

-- ============================================================
-- Comment like_count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_like_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- ============================================================
-- Chapter comment like_count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_chapter_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapter_comments SET like_count = like_count + 1 WHERE id = NEW.chapter_comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapter_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.chapter_comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chapter_comment_like_count
  AFTER INSERT OR DELETE ON chapter_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_chapter_comment_like_count();

-- ============================================================
-- Chapter like_count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_chapter_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters SET like_count = like_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chapters SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.chapter_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chapter_like_count
  AFTER INSERT OR DELETE ON chapter_likes
  FOR EACH ROW EXECUTE FUNCTION update_chapter_like_count();

-- ============================================================
-- Chapter comment_count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_chapter_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chapters SET comment_count = comment_count + 1 WHERE id = NEW.chapter_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_deleted = true AND OLD.is_deleted = false) THEN
    UPDATE chapters SET comment_count = GREATEST(0, comment_count - 1) WHERE id = COALESCE(NEW.chapter_id, OLD.chapter_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chapter_comment_count
  AFTER INSERT OR UPDATE OR DELETE ON chapter_comments
  FOR EACH ROW EXECUTE FUNCTION update_chapter_comment_count();

-- ============================================================
-- Page count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_page_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chapters
  SET page_count = (SELECT COUNT(*) FROM chapter_pages WHERE chapter_id = COALESCE(NEW.chapter_id, OLD.chapter_id))
  WHERE id = COALESCE(NEW.chapter_id, OLD.chapter_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_page_count
  AFTER INSERT OR DELETE ON chapter_pages
  FOR EACH ROW EXECUTE FUNCTION update_page_count();

-- ============================================================
-- Comment reply_count sync
-- ============================================================

CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE comments SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_reply_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_reply_count();

-- ============================================================
-- Premium subscription check - upgrade/downgrade role
-- ============================================================

CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Activate → set premium
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    UPDATE profiles SET role = 'premium' WHERE id = NEW.user_id AND role = 'user';
  END IF;

  -- Deactivate → revert to user (unless moderator/admin)
  IF NEW.status IN ('cancelled', 'expired') AND OLD.status = 'active' THEN
    UPDATE profiles SET role = 'user' WHERE id = NEW.user_id AND role = 'premium';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_subscription_role
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION handle_subscription_change();

-- ============================================================
-- Notification read_at auto-set
-- ============================================================

CREATE OR REPLACE FUNCTION handle_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_read
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION handle_notification_read();

-- ============================================================
-- Helper: get user role
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Helper: is_admin or moderator
-- ============================================================

CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = user_id AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Slugify function
-- ============================================================

CREATE OR REPLACE FUNCTION slugify(text_input TEXT)
RETURNS TEXT AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(text_input, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$ LANGUAGE sql IMMUTABLE;
