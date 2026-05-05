-- ============================================================
-- FIX: increment_view RPC function (was missing)
-- ============================================================

CREATE OR REPLACE FUNCTION increment_view(table_name TEXT, row_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF table_name = 'webtoons' THEN
    UPDATE webtoons SET view_count = view_count + 1 WHERE id = row_id;
  ELSIF table_name = 'chapters' THEN
    UPDATE chapters SET view_count = view_count + 1 WHERE id = row_id;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_view(TEXT, UUID) TO authenticated;

-- ============================================================
-- FIX: coin_transactions INSERT — allow users to insert own records
-- Previously only admin could insert, which blocked chapter unlocks
-- ============================================================

DROP POLICY IF EXISTS "coins_insert_own" ON coin_transactions;
CREATE POLICY "coins_insert_own" ON coin_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- ============================================================
-- FIX: reading_history — ensure upsert (UPDATE) policy exists
-- The upsert uses ON CONFLICT DO UPDATE which needs UPDATE permission
-- ============================================================

-- Already exists in 003 as "reading_history_update_own", verifying it covers all cases
-- No change needed — policy is: FOR UPDATE USING (auth.uid() = user_id)

-- ============================================================
-- FIX: notifications INSERT — allow trigger-generated inserts
-- The create_new_chapter_notifications trigger already uses SECURITY DEFINER
-- so it bypasses RLS. But direct system inserts also need a route.
-- Add a policy so the trigger owner can insert.
-- (SECURITY DEFINER functions run as the function owner, not the calling user,
--  so they bypass RLS already — this is just documentation/safety.)
-- ============================================================

-- No change needed here.
