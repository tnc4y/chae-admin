'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2, Upload, X, GripVertical, ImagePlus,
  ArrowLeft, Eye, EyeOff, Lock, Unlock, Monitor,
  ChevronLeft, ChevronRight, AlertCircle,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExistingPage { id: string; page_number: number; image_url: string }

interface PageItem {
  uid: string        // stable local id (crypto.randomUUID)
  dbId?: string      // real DB id, only for existing pages
  file?: File
  preview: string
  isNew: boolean
}

interface InitialData {
  id: string
  chapter_number: number
  title: string | null
  description: string | null
  is_premium: boolean
  is_published: boolean
  coin_cost: number
  thumbnail_url: string | null
  pages: ExistingPage[]
}

interface Props {
  webtoonId: string
  webtoonTitle: string
  webtoonType?: string
  nextChapterNumber: number
  initialData?: InitialData
}

// ─────────────────────────────────────────────
// Preview Modal
// ─────────────────────────────────────────────
function WebtoonPreview({ pages, onClose }: { pages: PageItem[]; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  // Track which page is in view via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    pageRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setCurrentPage(i) },
        { root: scrollRef.current, threshold: 0.4 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [pages.length])

  const scrollToPage = useCallback((idx: number) => {
    pageRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Keyboard: arrow up/down
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        scrollToPage(Math.min(currentPage + 1, pages.length - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        scrollToPage(Math.max(currentPage - 1, 0))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentPage, pages.length, scrollToPage, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <p className="text-white font-semibold text-sm">Webtoon Önizleme</p>
          <span className="text-slate-400 text-xs">{pages.length} sayfa · ↑↓ ile gezin</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {pages.map((page, i) => (
              <div
                key={page.uid}
                ref={el => { pageRefs.current[i] = el }}
                className="relative"
              >
                <img
                  src={page.preview}
                  alt={`Sayfa ${i + 1}`}
                  className="w-full block"
                  draggable={false}
                />

                {/* Connection point between pages */}
                {i < pages.length - 1 && (
                  <button
                    onClick={() => scrollToPage(i + 1)}
                    className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-1.5 bg-violet-600/25 hover:bg-violet-600/45 border-t border-b border-violet-500/40 transition group z-10"
                    title={`Sayfa ${i + 2}'ye git`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 group-hover:bg-white transition" />
                    <span className="text-violet-300 group-hover:text-white text-xs font-medium transition">
                      {i + 1} · · · {i + 2}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 group-hover:bg-white transition" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar: page minimap + nav buttons */}
        <div className="w-14 bg-slate-950/80 border-l border-slate-800 flex flex-col items-center py-3 gap-2 overflow-y-auto">
          {/* Up button */}
          <button
            onClick={() => scrollToPage(Math.max(currentPage - 1, 0))}
            disabled={currentPage === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition flex-shrink-0"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          {/* Page dots */}
          <div className="flex flex-col gap-1 flex-1">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPage(i)}
                title={`Sayfa ${i + 1}`}
                className={cn(
                  'w-9 h-6 rounded text-xs font-bold transition flex-shrink-0',
                  i === currentPage
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Down button */}
          <button
            onClick={() => scrollToPage(Math.min(currentPage + 1, pages.length - 1))}
            disabled={currentPage === pages.length - 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition flex-shrink-0"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MangaPreview({ pages, onClose }: { pages: PageItem[]; onClose: () => void }) {
  const [mangaPage, setMangaPage] = useState(0)

  const totalSpreads = Math.ceil(pages.length / 2)
  const spreadIndex = Math.floor(mangaPage / 2)
  const rightPage = pages[mangaPage]
  const leftPage = pages[mangaPage + 1]

  const goNext = useCallback(() =>
    setMangaPage(p => Math.min(p + 2, pages.length - (pages.length % 2 === 0 ? 2 : 1))), [pages.length])
  const goPrev = useCallback(() =>
    setMangaPage(p => Math.max(p - 2, 0)), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') goNext()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') goPrev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-white font-semibold text-sm">Manga Önizleme</p>
          <span className="text-slate-400 text-xs">
            Sayfa {mangaPage + 1}{leftPage ? `–${mangaPage + 2}` : ''} / {pages.length} · ←→ ile gezin
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Spread */}
      <div className="flex-1 flex items-stretch overflow-hidden">
        {/* Prev area (left click = go forward in manga = next spread) */}
        <button
          onClick={goNext}
          disabled={mangaPage + 2 >= pages.length}
          className="w-16 flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/5 disabled:opacity-0 transition flex-shrink-0"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Pages */}
        <div className="flex-1 flex items-center justify-center gap-0.5 overflow-hidden py-4">
          {/* Right page */}
          <div className="h-full flex-1 flex justify-end items-center">
            {rightPage && (
              <img src={rightPage.preview} alt={`Sayfa ${mangaPage + 1}`}
                className="h-full max-h-full object-contain max-w-[48vw]" draggable={false} />
            )}
          </div>

          {/* Spine */}
          <div className="w-px self-stretch bg-gradient-to-b from-transparent via-slate-600 to-transparent flex-shrink-0" />

          {/* Left page */}
          <div className="h-full flex-1 flex justify-start items-center">
            {leftPage ? (
              <img src={leftPage.preview} alt={`Sayfa ${mangaPage + 2}`}
                className="h-full max-h-full object-contain max-w-[48vw]" draggable={false} />
            ) : (
              <div className="max-w-[48vw] w-full h-full bg-slate-950/50 flex items-center justify-center">
                <span className="text-slate-700 text-sm">Son sayfa</span>
              </div>
            )}
          </div>
        </div>

        {/* Next area */}
        <button
          onClick={goPrev}
          disabled={mangaPage === 0}
          className="w-16 flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/5 disabled:opacity-0 transition flex-shrink-0"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom: spread dots */}
      <div className="flex items-center justify-center gap-1.5 py-3 bg-slate-950/80 border-t border-slate-800">
        {Array.from({ length: totalSpreads }).map((_, i) => (
          <button
            key={i}
            onClick={() => setMangaPage(i * 2)}
            title={`Sayfa ${i * 2 + 1}–${Math.min(i * 2 + 2, pages.length)}`}
            className={cn(
              'transition rounded',
              i === spreadIndex
                ? 'w-6 h-2 bg-violet-500'
                : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
            )}
          />
        ))}
      </div>
    </div>
  )
}

function PreviewModal({
  pages, isWebtoon, onClose,
}: { pages: PageItem[]; isWebtoon: boolean; onClose: () => void }) {
  if (pages.length === 0) return null
  return isWebtoon
    ? <WebtoonPreview pages={pages} onClose={onClose} />
    : <MangaPreview pages={pages} onClose={onClose} />
}

// ─────────────────────────────────────────────
// Main Form
// ─────────────────────────────────────────────
export default function ChapterForm({
  webtoonId,
  webtoonTitle,
  webtoonType = 'webtoon',
  nextChapterNumber,
  initialData,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initialData?.id
  const isWebtoon = webtoonType === 'webtoon' || webtoonType === 'manhwa'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    chapter_number: initialData?.chapter_number ?? nextChapterNumber,
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    is_premium: initialData?.is_premium ?? false,
    is_published: initialData?.is_published ?? false,
    coin_cost: initialData?.coin_cost ?? 5,
  })

  // ── Page state: ordered array, no mixing with deleted ──
  const [pages, setPages] = useState<PageItem[]>(
    initialData?.pages.map(p => ({
      uid: p.id,
      dbId: p.id,
      preview: p.image_url,
      isNew: false,
    })) ?? []
  )
  const [deletedDbIds, setDeletedDbIds] = useState<string[]>([])

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail_url ?? null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // ── Drag state (index-based, useState so React tracks it) ──
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  // ─────────────── File selection ───────────────
  function handleFilesSelected(files: FileList | null) {
    if (!files) return
    const newItems: PageItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        uid: crypto.randomUUID(),
        file: f,
        preview: URL.createObjectURL(f),
        isNew: true,
      }))
    setPages(prev => [...prev, ...newItems])
  }

  function removePage(uid: string) {
    const page = pages.find(p => p.uid === uid)
    if (page?.dbId) setDeletedDbIds(prev => [...prev, page.dbId!])
    setPages(prev => prev.filter(p => p.uid !== uid))
  }

  // ─────────────── Drag & Drop ───────────────
  function handleDragStart(i: number) {
    setDragIdx(i)
  }

  function handleDragEnter(i: number) {
    if (i === dragIdx) return
    setOverIdx(i)
  }

  function handleDragEnd() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      setPages(prev => {
        const arr = [...prev]
        const [moved] = arr.splice(dragIdx, 1)
        arr.splice(overIdx, 0, moved)
        return arr
      })
    }
    setDragIdx(null)
    setOverIdx(null)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // ─────────────── Upload ───────────────
  async function uploadToS3(file: File, folder: string): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Upload hatası') }
    return (await res.json()).url as string
  }

  // ─────────────── Submit ───────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pages.length === 0) { setError('En az 1 sayfa eklemelisiniz.'); return }
    setLoading(true); setError(null); setUploadProgress(0)

    try {
      let thumbnailUrl = initialData?.thumbnail_url ?? null
      if (thumbnailFile) thumbnailUrl = await uploadToS3(thumbnailFile, 'thumbnails')

      let chapterId = initialData?.id ?? ''
      const payload = {
        webtoon_id: webtoonId,
        chapter_number: form.chapter_number,
        title: form.title || null,
        description: form.description || null,
        is_premium: form.is_premium,
        is_published: form.is_published,
        coin_cost: form.is_premium ? form.coin_cost : 0,
        thumbnail_url: thumbnailUrl,
        slug: `bolum-${form.chapter_number}`,
        published_at: form.is_published ? new Date().toISOString() : null,
      }

      if (isEdit) {
        const { error: err } = await supabase.from('chapters').update(payload).eq('id', chapterId)
        if (err) throw err
      } else {
        const { data, error: err } = await supabase.from('chapters').insert(payload).select('id').single()
        if (err) throw err
        chapterId = data.id
      }

      // Delete removed pages
      if (deletedDbIds.length > 0) {
        await supabase.from('chapter_pages').delete().in('id', deletedDbIds)
      }

      // Upload new pages
      const newPages = pages.filter(p => p.isNew && p.file)
      const total = newPages.length
      let done = 0
      const urlMap: Record<string, string> = {}

      for (const p of newPages) {
        urlMap[p.uid] = await uploadToS3(p.file!, 'chapters')
        done++
        setUploadProgress(Math.round((done / total) * 100))
      }

      // Re-insert all page_number assignments based on current order
      // For existing pages: update page_number
      // For new pages: insert
      const insertRows: { chapter_id: string; page_number: number; image_url: string }[] = []

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i]
        const pageNum = i + 1

        if (p.isNew) {
          insertRows.push({ chapter_id: chapterId, page_number: pageNum, image_url: urlMap[p.uid] })
        } else if (p.dbId) {
          await supabase.from('chapter_pages').update({ page_number: pageNum }).eq('id', p.dbId)
        }
      }

      if (insertRows.length > 0) {
        const { error: err } = await supabase.from('chapter_pages').insert(insertRows)
        if (err) throw err
      }

      router.push(`/admin/webtoons/${webtoonId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setLoading(false); setUploadProgress(0)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition'
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'

  return (
    <>
      {showPreview && (
        <PreviewModal pages={pages} isWebtoon={isWebtoon} onClose={() => setShowPreview(false)} />
      )}

      <form onSubmit={handleSubmit} className="max-w-5xl">
        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Sol: Sayfalar ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Dropzone */}
            <div
              className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-violet-500/50 transition cursor-pointer bg-slate-900/50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFilesSelected(e.dataTransfer.files) }}
            >
              <ImagePlus className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">Sayfaları sürükle veya tıkla</p>
              <p className="text-slate-600 text-xs mt-1">
                {isWebtoon ? 'Webtoon: yukarıdan aşağıya okunur' : 'Manga: sağdan sola, kitap gibi'}
                {' · '}JPG, PNG, WebP · Çoklu seçim
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={e => handleFilesSelected(e.target.files)} className="hidden" />
            </div>

            {/* Page grid */}
            {pages.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white text-sm font-medium">{pages.length} sayfa</p>
                  <div className="flex items-center gap-2">
                    <p className="text-slate-600 text-xs">Sıralamak için sürükle</p>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs rounded-lg border border-violet-500/30 transition"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Önizle ({isWebtoon ? 'Webtoon' : 'Manga'})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {pages.map((page, index) => (
                    <div
                      key={page.uid}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      className={cn(
                        'relative group aspect-[2/3] rounded-lg overflow-hidden bg-slate-800 cursor-grab active:cursor-grabbing transition-all',
                        dragIdx === index && 'opacity-40 scale-95',
                        overIdx === index && dragIdx !== index && 'ring-2 ring-violet-500 scale-105',
                      )}
                    >
                      <img src={page.preview} alt={`Sayfa ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none" />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition" />

                      {/* Page number */}
                      <div className="absolute bottom-1 left-1 min-w-[20px] h-5 bg-black/70 rounded px-1 text-white text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </div>

                      {/* Drag handle */}
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition">
                        <GripVertical className="w-4 h-4 text-white drop-shadow" />
                      </div>

                      {/* New badge */}
                      {page.isNew && (
                        <span className="absolute top-1 right-6 text-xs bg-violet-600 text-white px-1 rounded leading-5">
                          Yeni
                        </span>
                      )}

                      {/* Remove */}
                      <button type="button" onClick={() => removePage(page.uid)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-400 rounded opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}

                  {/* Add more */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="aspect-[2/3] rounded-lg border-2 border-dashed border-slate-700 hover:border-violet-500/50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-violet-400 transition">
                    <Upload className="w-5 h-5" />
                    <span className="text-xs">Ekle</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Sağ: Ayarlar ─── */}
          <div className="space-y-4">

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3">Bölüm Bilgileri</h3>

              <div>
                <label className={labelCls}>Bölüm No *</label>
                <input type="number" step="0.5" min="0"
                  value={form.chapter_number}
                  onChange={e => setForm(f => ({ ...f, chapter_number: parseFloat(e.target.value) || 0 }))}
                  required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Başlık</label>
                <input type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls} placeholder="Opsiyonel" />
              </div>
              <div>
                <label className={labelCls}>Açıklama</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className={inputCls} placeholder="Opsiyonel" />
              </div>
            </div>

            {/* Thumbnail */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3 mb-4">Thumbnail</h3>
              {thumbnailPreview ? (
                <div className="relative">
                  <img src={thumbnailPreview} alt="thumb" className="w-full aspect-video object-cover rounded-lg" />
                  <button type="button"
                    onClick={() => { setThumbnailPreview(null); setThumbnailFile(null) }}
                    className="absolute top-2 right-2 w-6 h-6 bg-slate-900/80 rounded-full flex items-center justify-center text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-violet-500/50 transition">
                  <Upload className="w-5 h-5 text-slate-500 mb-1" />
                  <span className="text-slate-500 text-xs">Thumbnail yükle</span>
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)) }
                  }} className="hidden" />
                </label>
              )}
            </div>

            {/* Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm border-b border-slate-800 pb-3">Ayarlar</h3>

              {/* Premium */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    {form.is_premium
                      ? <Lock className="w-4 h-4 text-yellow-400" />
                      : <Unlock className="w-4 h-4 text-slate-500" />}
                    <div>
                      <p className="text-sm text-white">Premium</p>
                      <p className="text-xs text-slate-500">Coin ile açılır</p>
                    </div>
                  </div>
                  <div onClick={() => setForm(f => ({ ...f, is_premium: !f.is_premium }))}
                    className={cn('relative w-10 h-5 rounded-full transition cursor-pointer',
                      form.is_premium ? 'bg-yellow-500' : 'bg-slate-700')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all',
                      form.is_premium ? 'left-[22px]' : 'left-0.5')} />
                  </div>
                </label>
                {form.is_premium && (
                  <div className="mt-3">
                    <label className={labelCls}>Coin Maliyeti</label>
                    <input type="number" min="1" value={form.coin_cost}
                      onChange={e => setForm(f => ({ ...f, coin_cost: parseInt(e.target.value) || 1 }))}
                      className={inputCls} />
                  </div>
                )}
              </div>

              {/* Publish */}
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {form.is_published
                    ? <Eye className="w-4 h-4 text-green-400" />
                    : <EyeOff className="w-4 h-4 text-slate-500" />}
                  <div>
                    <p className="text-sm text-white">Yayınla</p>
                    <p className="text-xs text-slate-500">Okuyucular görebilir</p>
                  </div>
                </div>
                <div onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                  className={cn('relative w-10 h-5 rounded-full transition cursor-pointer',
                    form.is_published ? 'bg-green-500' : 'bg-slate-700')}>
                  <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all',
                    form.is_published ? 'left-[22px]' : 'left-0.5')} />
                </div>
              </label>
            </div>

            {/* Upload progress */}
            {loading && uploadProgress > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <p className="text-slate-400 text-xs">Yükleniyor...</p>
                  <p className="text-violet-400 text-xs font-bold">%{uploadProgress}</p>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-violet-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button type="button" onClick={() => router.back()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition">
                <ArrowLeft className="w-4 h-4" />
                Geri
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
