import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import AuthorsClient from './AuthorsClient'

export default async function AuthorsPage() {
  const supabase = await createClient()

  const { data: authors } = await supabase
    .from('authors')
    .select('id, name, slug, bio, avatar_url, is_active, created_at')
    .order('name')

  return (
    <>
      <Header title="Yazarlar" subtitle={`${authors?.length ?? 0} yazar`} />
      <main className="flex-1 p-6">
        <AuthorsClient authors={authors ?? []} />
      </main>
    </>
  )
}
