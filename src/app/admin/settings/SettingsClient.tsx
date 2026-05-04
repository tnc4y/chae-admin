'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'
import type { SiteSetting } from '@/types/database'

export default function SettingsClient({ settings }: { settings: SiteSetting[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map(s => [s.key, JSON.stringify(s.value).replace(/^"|"$/g, '')]))
  )
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setSaved(false)

    for (const setting of settings) {
      const rawVal = values[setting.key]
      let parsedValue: unknown = rawVal

      // Try to parse as JSON (for booleans, numbers, objects)
      try {
        parsedValue = JSON.parse(rawVal)
      } catch {
        parsedValue = rawVal // keep as string
      }

      await supabase
        .from('site_settings')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('key', setting.key)
    }

    setLoading(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-white font-semibold text-sm">Genel Ayarlar</h2>
        </div>
        <div className="p-5 space-y-4">
          {settings.map(s => (
            <div key={s.key}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {s.key.replace(/_/g, ' ')}
              </label>
              {s.description && <p className="text-slate-600 text-xs mb-2">{s.description}</p>}
              <input
                type="text"
                value={values[s.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [s.key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-violet-600/20"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? 'Kaydedildi!' : 'Kaydet'}
      </button>
    </div>
  )
}
