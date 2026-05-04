import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, username, display_name, role, is_active, is_banned, coins, created_at, updated_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <Header title="Kullanıcılar" subtitle={`${users?.length ?? 0} kayıtlı kullanıcı`} />
      <main className="flex-1 p-6">
        <UsersClient users={users ?? []} />
      </main>
    </>
  )
}
