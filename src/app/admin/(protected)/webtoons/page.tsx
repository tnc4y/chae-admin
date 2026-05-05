import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import WebtoonsClient from './WebtoonsClient'

export default async function WebtoonsPage() {
  const supabase = await createClient()

  const [{ data: webtoons }, { data: storageRows }] = await Promise.all([
    supabase
      .from('webtoons')
      .select(`
        id, title, slug, cover_url, status, type,
        is_published, is_premium, is_featured,
        chapter_count, view_count, avg_rating,
        published_at, created_at,
        author:authors!webtoons_author_id_fkey(name)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('v_webtoon_storage').select('webtoon_id, total_size'),
  ])

  const storageMap = Object.fromEntries(
    (storageRows ?? []).map((r) => [r.webtoon_id, Number(r.total_size ?? 0)])
  )

  const webtoonsWithStorage = (webtoons ?? []).map((w) => ({
    ...w,
    storage_size: storageMap[w.id] ?? 0,
  }))

  return (
    <>
      <Header title="Webtoonlar" subtitle={`${webtoons?.length ?? 0} webtoon`} />
      <main className="flex-1 p-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <WebtoonsClient webtoons={webtoonsWithStorage as any} />
      </main>
    </>
  )
}
