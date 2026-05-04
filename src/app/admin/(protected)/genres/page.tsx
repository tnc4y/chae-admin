import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import GenresClient from './GenresClient'

export default async function GenresPage() {
  const supabase = await createClient()
  const { data: genres } = await supabase
    .from('genres')
    .select('id, name, slug, description, color, created_at')
    .order('name')

  return (
    <>
      <Header title="Türler / Kategoriler" subtitle={`${genres?.length ?? 0} tür`} />
      <main className="flex-1 p-6">
        <GenresClient genres={genres ?? []} />
      </main>
    </>
  )
}
