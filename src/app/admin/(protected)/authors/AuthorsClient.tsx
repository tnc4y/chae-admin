'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/admin/DataTable'
import { slugify, formatDate } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import type { Author } from '@/types/database'

type AuthorRow = Pick<Author, 'id' | 'name' | 'slug' | 'bio' | 'avatar_url' | 'is_active' | 'created_at'>

const emptyForm = { name: '', slug: '', bio: '' }

export default function AuthorsClient({ authors }: { authors: AuthorRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<AuthorRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setForm(emptyForm)
    setEditTarget(null)
    setModal('add')
    setError(null)
  }

  function openEdit(a: AuthorRow) {
    setForm({ name: a.name, slug: a.slug, bio: a.bio ?? '' })
    setEditTarget(a)
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
      bio: form.bio || null,
    }

    if (modal === 'edit' && editTarget) {
      const { error: err } = await supabase.from('authors').update(payload).eq('id', editTarget.id)
      if (err) { setError(err.message); setLoading(false); return }
    } else {
      const { error: err } = await supabase.from('authors').insert(payload)
      if (err) { setError(err.message); setLoading(false); return }
    }

    setModal(null)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu yazarı silmek istediğinize emin misiniz?')) return
    await supabase.from('authors').update({ is_active: false }).eq('id', id)
    router.refresh()
  }

  const columns: Column<AuthorRow>[] = [
    {
      key: 'name',
      label: 'Yazar',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt={row.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{row.name.charAt(0)}</span>
            </div>
          )}
          <div>
            <p className="text-white text-sm font-medium">{row.name}</p>
            <p className="text-slate-500 text-xs">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'bio',
      label: 'Bio',
      render: (v) => <span className="text-slate-400 text-xs line-clamp-1">{(v as string) || '—'}</span>,
    },
    {
      key: 'is_active',
      label: 'Durum',
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {v ? 'Aktif' : 'Pasif'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Eklenme',
      render: (v) => <span className="text-slate-500 text-xs">{formatDate(v as string)}</span>,
    },
  ]

  const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition'

  return (
    <>
      <div className="flex justify-end mb-6">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" />
          Yeni Yazar
        </button>
      </div>

      <DataTable
        data={authors}
        columns={columns}
        searchPlaceholder="Yazar ara..."
        searchKeys={['name', 'slug']}
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      />

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">{modal === 'edit' ? 'Yazarı Düzenle' : 'Yeni Yazar'}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</p>}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">İsim *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                  className={inputCls}
                  placeholder="Yazar adı"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Slug</label>
                <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} placeholder="otomatik" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Biyografi</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className={inputCls} placeholder="Kısa biyografi..." />
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
