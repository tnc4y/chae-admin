'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import type { Genre } from '@/types/database'

type GenreRow = Pick<Genre, 'id' | 'name' | 'slug' | 'description' | 'color' | 'created_at'>

const PRESET_COLORS = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6',
  '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#F97316',
]

const emptyForm = { name: '', slug: '', description: '', color: '#8B5CF6' }

export default function GenresClient({ genres }: { genres: GenreRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<GenreRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setForm(emptyForm)
    setEditTarget(null)
    setModal('add')
    setError(null)
  }

  function openEdit(g: GenreRow) {
    setForm({ name: g.name, slug: g.slug, description: g.description ?? '', color: g.color ?? '#8B5CF6' })
    setEditTarget(g)
    setModal('edit')
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name.trim()),
      description: form.description || null,
      color: form.color,
    }

    if (modal === 'edit' && editTarget) {
      const { error: err } = await supabase.from('genres').update(payload).eq('id', editTarget.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase.from('genres').insert(payload)
      if (err) { setError(err.message); setLoading(false); return }
    }

    setModal(null)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu türü silmek istediğinize emin misiniz?')) return
    await supabase.from('genres').delete().eq('id', id)
    router.refresh()
  }

  const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" />
          Yeni Tür
        </button>
      </div>

      {/* Genre grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {genres.map(g => (
          <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition group">
            <div className="flex items-start justify-between mb-2">
              <div
                className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: g.color }}
              />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => openEdit(g)} className="p-1 text-slate-400 hover:text-white rounded">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(g.id)} className="p-1 text-slate-400 hover:text-red-400 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-white text-sm font-medium">{g.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">{g.slug}</p>
            {g.description && <p className="text-slate-600 text-xs mt-1 line-clamp-2">{g.description}</p>}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">{modal === 'edit' ? 'Türü Düzenle' : 'Yeni Tür'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</p>}

              <div>
                <label className={labelCls}>İsim *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  className={inputCls}
                  placeholder="Tür adı"
                />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} placeholder="otomatik" />
              </div>
              <div>
                <label className={labelCls}>Açıklama</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Kısa açıklama..." />
              </div>
              <div>
                <label className={labelCls}>Renk</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
                    title="Özel renk"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !form.name.trim()}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {modal === 'edit' ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
