import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import CommentsClient from './CommentsClient'

export default async function CommentsPage() {
  const supabase = await createClient()

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      id, content, is_spoiler, is_pinned, is_deleted,
      like_count, reply_count, created_at,
      user:profiles!comments_user_id_fkey(username, display_name),
      webtoon:webtoons!comments_webtoon_id_fkey(title, slug)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  return (
    <>
      <Header title="Yorumlar" subtitle={`${comments?.length ?? 0} yorum`} />
      <main className="flex-1 p-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <CommentsClient comments={(comments ?? []) as any} />
      </main>
    </>
  )
}
