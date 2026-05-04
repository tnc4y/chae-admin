import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Header from '@/components/admin/Header'
import ChapterForm from '@/components/admin/ChapterForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewChapterPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: webtoon } = await supabase
    .from('webtoons')
    .select('id, title, type, chapter_count')
    .eq('id', id)
    .single()

  if (!webtoon) notFound()

  return (
    <>
      <Header title="Yeni Bölüm" subtitle={webtoon.title} />
      <main className="flex-1 p-6">
        <ChapterForm
          webtoonId={id}
          webtoonTitle={webtoon.title}
          webtoonType={webtoon.type}
          nextChapterNumber={webtoon.chapter_count + 1}
        />
      </main>
    </>
  )
}
