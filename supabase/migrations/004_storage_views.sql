-- ============================================================
-- STORAGE ANALYTICS VIEWS
-- Webtoon ve bölüm bazlı depolama boyutu hesaplama
-- ============================================================

-- Webtoon bazlı toplam depolama boyutu
CREATE OR REPLACE VIEW v_webtoon_storage AS
SELECT
  c.webtoon_id,
  COALESCE(SUM(cp.file_size), 0)::bigint AS total_size,
  COUNT(cp.id)::integer AS total_pages
FROM chapters c
LEFT JOIN chapter_pages cp ON cp.chapter_id = c.id
GROUP BY c.webtoon_id;

-- Bölüm bazlı toplam depolama boyutu
CREATE OR REPLACE VIEW v_chapter_storage AS
SELECT
  chapter_id,
  COALESCE(SUM(file_size), 0)::bigint AS total_size,
  COUNT(*)::integer AS page_count
FROM chapter_pages
GROUP BY chapter_id;
