import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id, reason, description, status, created_at, updated_at,
      reporter:profiles!reports_reporter_id_fkey(username, display_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header title="Şikayetler" subtitle={`${reports?.length ?? 0} şikayet`} />
      <main className="flex-1 p-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ReportsClient reports={(reports ?? []) as any} />
      </main>
    </>
  )
}
