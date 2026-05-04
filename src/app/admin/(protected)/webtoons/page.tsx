import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import WebtoonsClient from './WebtoonsClient'

export default async function WebtoonsPage() {
  const supabase = await createClient()

  const { data: webtoons } = await supabase
    .from('webtoons')
    .select(`
      id, title, slug, cover_url, status, type,
      is_published, is_premium, is_featured,
      chapter_count, view_count, avg_rating,
      published_at, created_at,
      author:authors!webtoons_author_id_fkey(name)
    `)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header title="Webtoonlar" subtitle={`${webtoons?.length ?? 0} webtoon`} />
      <main className="flex-1 p-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <WebtoonsClient webtoons={(webtoons ?? []) as any} />
      </main>
    </>
  )
}
