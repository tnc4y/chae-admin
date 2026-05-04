'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Loader2, Upload, X } from 'lucide-react'
import type { Author, Genre, WebtoonStatus, WebtoonType, AgeRating, ReleaseDay } from '@/types/database'

interface Props {
  authors: Pick<Author, 'id' | 'name'>[]
  genres: Pick<Genre, 'id' | 'name'>[]
  initialData?: {
    id: string
    title: string
    slug: string
    description: string | null
    status: WebtoonStatus
    type: WebtoonType
    age_rating: AgeRating
    release_day: ReleaseDay | null
    author_id: string | null
    artist_id: string | null
    is_premium: boolean
    is_published: boolean
    is_featured: boolean
    cover_url: string | null
    banner_url: string | null
    selectedGenreIds: string[]
  }
}

const STATUSES: { value: WebtoonStatus; label: string }[] = [
  { value: 'ongoing', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'hiatus', label: 'Ara Verildi' },
  { value: 'dropped', label: 'Bırakıldı' },
]

const TYPES: { value: WebtoonType; label: string }[] = [
  { value: 'webtoon', label: 'Webtoon' },
  { value: 'manga', label: 'Manga' },
  { value: 'manhwa', label: 'Manhwa' },
  { value: 'manhua', label: 'Manhua' },
]

const AGE_RATINGS: { value: AgeRating; label: string }[] = [
  { value: 'all', label: 'Herkes' },
  { value: 'teen', label: '13+' },
  { value: 'mature', label: '18+' },
]

const DAYS: { value: ReleaseDay; label: string }[] = [
  { value: 'monday', label: 'Pazartesi' },
  { value: 'tuesday', label: 'Salı' },
  { value: 'wednesday', label: 'Çarşamba' },
  { value: 'thursday', label: 'Perşembe' },
  { value: 'friday', label: 'Cuma' },
  { value: 'saturday', label: 'Cumartesi' },
  { value: 'sunday', label: 'Pazar' },
]

export default function WebtoonForm({ authors, genres, initialData }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initialData?.id

  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    status: initialData?.status ?? 'ongoing' as WebtoonStatus,
    type: initialData?.type ?? 'webtoon' as WebtoonType,
    age_rating: initialData?.age_rating ?? 'all' as AgeRating,
    release_day: initialData?.release_day ?? '' as ReleaseDay | '',
    author_id: initialData?.author_id ?? '',
    artist_id: initialData?.artist_id ?? '',
    is_premium: initialData?.is_premium ?? false,
    is_published: initialData?.is_published ?? false,
    is_featured: initialData?.is_featured ?? false,
  })

  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialData?.selectedGenreIds ?? [])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.cover_url ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTitleChange(title: string) {
    setForm(f => ({
      ...f,
      title,
      slug: isEdit ? f.slug : slugify(title),
    }))
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function toggleGenre(id: string) {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let cover_url = initialData?.cover_url ?? null

      // Upload cover to S3 via API route
      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        fd.append('folder', 'covers')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) throw new Error('Kapak resmi yüklenemedi.')
        const json = await res.json()
        cover_url = json.url
      }

      const payload = {
        ...form,
        slug: form.slug || slugify(form.title),
        cover_url,
        release_day: form.release_day || null,
        author_id: form.author_id || null,
        artist_id: form.artist_id || null,
      }

      if (isEdit) {
        const { error: err } = await supabase
          .from('webtoons')
          .update(payload)
          .eq('id', initialData!.id)
        if (err) throw err

        // Update genres
        await supabase.from('webtoon_genres').delete().eq('webtoon_id', initialData!.id)
        if (selectedGenres.length > 0) {
          await supabase.from('webtoon_genres').insert(
            selectedGenres.map(genre_id => ({ webtoon_id: initialData!.id, genre_id }))
          )
        }
      } else {
        const { data: newWebtoon, error: err } = await supabase
          .from('webtoons')
          .insert(payload)
          .select('id')
          .single()
        if (err) throw err

        if (selectedGenres.length > 0) {
          await supabase.from('webtoon_genres').insert(
            selectedGenres.map(genre_id => ({ webtoon_id: newWebtoon.id, genre_id }))
          )
        }
      }

      router.push('/admin/webtoons')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3">Temel Bilgiler</h3>

            <div>
              <label className={labelCls}>Başlık *</label>
              <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)} required className={inputCls} placeholder="Webtoon adı" />
            </div>

            <div>
              <label className={labelCls}>Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={inputCls} placeholder="otomatik-olusturulur" />
            </div>

            <div>
              <label className={labelCls}>Açıklama</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                className={inputCls}
                placeholder="Webtoon hakkında kısa açıklama..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Yazar</label>
                <select value={form.author_id} onChange={e => setForm(f => ({ ...f, author_id: e.target.value }))} className={inputCls}>
                  <option value="">Seç...</option>
                  {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Çizer</label>
                <select value={form.artist_id} onChange={e => setForm(f => ({ ...f, artist_id: e.target.value }))} className={inputCls}>
                  <option value="">Seç...</option>
                  {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3">Sınıflandırma</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tür</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as WebtoonType }))} className={inputCls}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Durum</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as WebtoonStatus }))} className={inputCls}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Yaş Sınırı</label>
                <select value={form.age_rating} onChange={e => setForm(f => ({ ...f, age_rating: e.target.value as AgeRating }))} className={inputCls}>
                  {AGE_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Yayın Günü</label>
                <select value={form.release_day} onChange={e => setForm(f => ({ ...f, release_day: e.target.value as ReleaseDay | '' }))} className={inputCls}>
                  <option value="">Belirtilmemiş</option>
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Kategoriler</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGenre(g.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      selectedGenres.includes(g.id)
                        ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - cover + settings */}
        <div className="space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3 mb-4">Kapak Resmi</h3>
            <div className="space-y-3">
              {coverPreview ? (
                <div className="relative">
                  <img src={coverPreview} alt="cover" className="w-full aspect-[2/3] object-cover rounded-xl" />
                  <button
                    type="button"
                    onClick={() => { setCoverPreview(null); setCoverFile(null) }}
                    className="absolute top-2 right-2 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-[2/3] border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-violet-500/50 transition bg-slate-800/50">
                  <Upload className="w-6 h-6 text-slate-500 mb-2" />
                  <span className="text-slate-500 text-xs">Resim yükle</span>
                  <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3">Ayarlar</h3>

            {[
              { key: 'is_published', label: 'Yayında', desc: 'Siteye görünür' },
              { key: 'is_premium', label: 'Premium', desc: 'Ücretli içerik' },
              { key: 'is_featured', label: 'Öne Çıkan', desc: 'Ana sayfada göster' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <div
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                  className={`relative w-10 h-5 rounded-full transition ${form[key as keyof typeof form] ? 'bg-violet-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form[key as keyof typeof form] ? 'left-5.5' : 'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-sm font-medium rounded-xl transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
