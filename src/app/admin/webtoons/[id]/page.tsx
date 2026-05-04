import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import WebtoonForm from '@/components/admin/WebtoonForm'
import Link from 'next/link'
import { formatDate, formatNumber } from '@/lib/utils'
import { BookOpen, Plus } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WebtoonDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: webtoon },
    { data: authors },
    { data: genres },
  ] = await Promise.all([
    supabase
      .from('webtoons')
      .select(`*, webtoon_genres(genre_id)`)
      .eq('id', id)
      .single(),
    supabase.from('authors').select('id, name').eq('is_active', true).order('name'),
    supabase.from('genres').select('id, name').order('name'),
  ])

  if (!webtoon) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, chapter_number, title, is_published, is_premium, view_count, like_count, comment_count, published_at, created_at')
    .eq('webtoon_id', id)
    .order('chapter_number', { ascending: false })

  const initialData = {
    id: webtoon.id,
    title: webtoon.title,
    slug: webtoon.slug,
    description: webtoon.description,
    status: webtoon.status,
    type: webtoon.type,
    age_rating: webtoon.age_rating,
    release_day: webtoon.release_day,
    author_id: webtoon.author_id,
    artist_id: webtoon.artist_id,
    is_premium: webtoon.is_premium,
    is_published: webtoon.is_published,
    is_featured: webtoon.is_featured,
    cover_url: webtoon.cover_url,
    banner_url: webtoon.banner_url,
    selectedGenreIds: webtoon.webtoon_genres?.map((g: { genre_id: string }) => g.genre_id) ?? [],
  }

  return (
    <>
      <Header title={webtoon.title} subtitle="Webtoon düzenle" />
      <main className="flex-1 p-6 space-y-8">
        <WebtoonForm authors={authors ?? []} genres={genres ?? []} initialData={initialData} />

        {/* Chapters section */}
        <div className="max-w-4xl">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Bölümler ({chapters?.length ?? 0})</h2>
              <Link
                href={`/admin/webtoons/${id}/chapters/new`}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Yeni Bölüm
              </Link>
            </div>

            <div className="divide-y divide-slate-800">
              {!chapters?.length ? (
                <div className="py-10 text-center text-slate-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Henüz bölüm yok.</p>
                </div>
              ) : (
                chapters.map((ch) => (
                  <div key={ch.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/40 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-violet-400 text-sm font-semibold">#{ch.chapter_number}</span>
                        <span className="text-white text-sm">{ch.title ?? 'Bölüm ' + ch.chapter_number}</span>
                        {ch.is_premium && (
                          <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">Premium</span>
                        )}
                        {!ch.is_published && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">Taslak</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                        <span>{formatNumber(ch.view_count)} görüntülenme</span>
                        <span>{ch.like_count} beğeni</span>
                        <span>{ch.comment_count} yorum</span>
                        {ch.published_at && <span>{formatDate(ch.published_at)}</span>}
                      </div>
                    </div>
                    <Link
                      href={`/admin/webtoons/${id}/chapters/${ch.id}`}
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      Düzenle
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
