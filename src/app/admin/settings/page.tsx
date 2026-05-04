import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('site_settings').select('*').order('key')

  return (
    <>
      <Header title="Site Ayarları" subtitle="Platform konfigürasyonu" />
      <main className="flex-1 p-6">
        <SettingsClient settings={settings ?? []} />
      </main>
    </>
  )
}
