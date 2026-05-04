import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import ChapterForm from '@/components/admin/ChapterForm'

interface Props {
  params: Promise<{ id: string; chapterId: string }>
}

export default async function EditChapterPage({ params }: Props) {
  const { id, chapterId } = await params
  const supabase = await createClient()

  const [{ data: webtoon }, { data: chapter }, { data: pages }] = await Promise.all([
    supabase.from('webtoons').select('id, title, type').eq('id', id).single(),
    supabase.from('chapters').select('*').eq('id', chapterId).eq('webtoon_id', id).single(),
    supabase
      .from('chapter_pages')
      .select('id, page_number, image_url')
      .eq('chapter_id', chapterId)
      .order('page_number'),
  ])

  if (!webtoon || !chapter) notFound()

  return (
    <>
      <Header title={`Bölüm ${chapter.chapter_number} Düzenle`} subtitle={webtoon.title} />
      <main className="flex-1 p-6">
        <ChapterForm
          webtoonId={id}
          webtoonTitle={webtoon.title}
          webtoonType={webtoon.type}
          nextChapterNumber={chapter.chapter_number}
          initialData={{
            id: chapter.id,
            chapter_number: chapter.chapter_number,
            title: chapter.title,
            description: chapter.description,
            is_premium: chapter.is_premium,
            is_published: chapter.is_published,
            coin_cost: chapter.coin_cost,
            thumbnail_url: chapter.thumbnail_url,
            pages: pages ?? [],
          }}
        />
      </main>
    </>
  )
}
