'use client'

import Link from 'next/link'
import DataTable, { Column } from '@/components/admin/DataTable'
import { formatDate, formatNumber, formatFileSize } from '@/lib/utils'
import { Plus, Pencil, BookOpen, HardDrive } from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  ongoing: 'Devam Ediyor',
  completed: 'Tamamlandı',
  hiatus: 'Ara Verildi',
  dropped: 'Bırakıldı',
}

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'bg-green-500/20 text-green-400',
  completed: 'bg-blue-500/20 text-blue-400',
  hiatus: 'bg-yellow-500/20 text-yellow-400',
  dropped: 'bg-red-500/20 text-red-400',
}

const TYPE_LABELS: Record<string, string> = {
  webtoon: 'Webtoon',
  manga: 'Manga',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
}

interface WebtoonRow {
  id: string
  title: string
  slug: string
  cover_url: string | null
  status: string
  type: string
  is_published: boolean
  is_premium: boolean
  chapter_count: number
  view_count: number
  avg_rating: number
  created_at: string
  author: { name: string }[] | null
  storage_size: number
}

export default function WebtoonsClient({ webtoons }: { webtoons: WebtoonRow[] }) {
  const columns: Column<WebtoonRow>[] = [
    {
      key: 'title',
      label: 'Webtoon',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.cover_url ? (
            <img src={row.cover_url} alt={row.title} className="w-8 h-10 object-cover rounded flex-shrink-0" />
          ) : (
            <div className="w-8 h-10 bg-slate-800 rounded flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-slate-600" />
            </div>
          )}
          <div>
            <p className="text-white font-medium text-sm">{row.title}</p>
            <p className="text-slate-500 text-xs">{row.author?.[0]?.name ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Tür',
      render: (v) => <span className="text-slate-300 text-xs">{TYPE_LABELS[v as string] ?? String(v)}</span>,
    },
    {
      key: 'status',
      label: 'Durum',
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v as string] ?? ''}`}>
          {STATUS_LABELS[v as string] ?? String(v)}
        </span>
      ),
    },
    {
      key: 'chapter_count',
      label: 'Bölüm',
      render: (v) => <span className="text-slate-300">{v as number}</span>,
    },
    {
      key: 'view_count',
      label: 'Görüntülenme',
      render: (v) => <span className="text-slate-300">{formatNumber(v as number)}</span>,
    },
    {
      key: 'avg_rating',
      label: 'Puan',
      render: (v) => (
        <span className="text-yellow-400 font-medium text-sm">
          {(v as number) > 0 ? (v as number).toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'is_published',
      label: 'Yayın',
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
          {v ? 'Yayında' : 'Taslak'}
        </span>
      ),
    },
    {
      key: 'storage_size',
      label: 'Boyut',
      render: (v) => (
        <span className="flex items-center gap-1 text-slate-400 text-xs">
          <HardDrive className="w-3 h-3 text-slate-600" />
          {formatFileSize(v as number)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Eklenme',
      render: (v) => <span className="text-slate-500 text-xs">{formatDate(v as string)}</span>,
    },
  ]

  return (
    <>
      <div className="flex justify-end mb-6">
        <Link
          href="/admin/webtoons/new"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" />
          Yeni Webtoon
        </Link>
      </div>

      <DataTable
        data={webtoons}
        columns={columns}
        searchPlaceholder="Webtoon ara..."
        searchKeys={['title', 'slug']}
        pageSize={20}
        actions={(row) => (
          <Link
            href={`/admin/webtoons/${row.id}`}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition inline-flex"
            title="Düzenle"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
        )}
      />
    </>
  )
}
