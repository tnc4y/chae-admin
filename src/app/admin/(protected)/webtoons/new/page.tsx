import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import WebtoonForm from '@/components/admin/WebtoonForm'

export default async function NewWebtoonPage() {
  const supabase = await createClient()

  const [{ data: authors }, { data: genres }] = await Promise.all([
    supabase.from('authors').select('id, name').eq('is_active', true).order('name'),
    supabase.from('genres').select('id, name').order('name'),
  ])

  return (
    <>
      <Header title="Yeni Webtoon" subtitle="Yeni bir webtoon ekle" />
      <main className="flex-1 p-6">
        <WebtoonForm authors={authors ?? []} genres={genres ?? []} />
      </main>
    </>
  )
}
