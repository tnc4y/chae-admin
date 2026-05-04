'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/admin/DataTable'
import { formatDateTime, truncate } from '@/lib/utils'
import { Trash2, Pin, Eye, EyeOff } from 'lucide-react'

interface CommentRow {
  id: string
  content: string
  is_spoiler: boolean
  is_pinned: boolean
  is_deleted: boolean
  like_count: number
  reply_count: number
  created_at: string
  user: { username: string; display_name: string | null } | null
  webtoon: { title: string; slug: string } | null
}

export default function CommentsClient({ comments }: { comments: CommentRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'deleted'>('active')

  const filtered = comments.filter(c => {
    if (filter === 'active') return !c.is_deleted
    if (filter === 'deleted') return c.is_deleted
    return true
  })

  async function handleDelete(id: string) {
    if (!confirm('Yorumu silmek istediğinize emin misiniz?')) return
    setLoadingId(id)
    await supabase.from('comments').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', id)
    router.refresh()
    setLoadingId(null)
  }

  async function handleRestore(id: string) {
    setLoadingId(id)
    await supabase.from('comments').update({ is_deleted: false, deleted_at: null }).eq('id', id)
    router.refresh()
    setLoadingId(null)
  }

  async function togglePin(id: string, current: boolean) {
    setLoadingId(id)
    await supabase.from('comments').update({ is_pinned: !current }).eq('id', id)
    router.refresh()
    setLoadingId(null)
  }

  const columns: Column<CommentRow>[] = [
    {
      key: 'content',
      label: 'Yorum',
      render: (_, row) => (
        <div>
          <p className={`text-sm ${row.is_deleted ? 'text-slate-600 line-through' : 'text-slate-200'}`}>
            {truncate(row.content, 80)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 text-xs">@{row.user?.username ?? '?'}</span>
            <span className="text-slate-700 text-xs">→</span>
            <span className="text-violet-400 text-xs">{row.webtoon?.title ?? '?'}</span>
            {row.is_spoiler && <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">Spoiler</span>}
            {row.is_pinned && <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Sabit</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'like_count',
      label: 'Beğeni',
      render: (v) => <span className="text-slate-300 text-sm">{v as number}</span>,
    },
    {
      key: 'reply_count',
      label: 'Yanıt',
      render: (v) => <span className="text-slate-300 text-sm">{v as number}</span>,
    },
    {
      key: 'created_at',
      label: 'Tarih',
      render: (v) => <span className="text-slate-500 text-xs">{formatDateTime(v as string)}</span>,
    },
  ]

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'active', 'deleted'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-xl transition ${
              filter === f
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-700'
            }`}
          >
            {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Silinen'}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Yorum içeriği ara..."
        searchKeys={['content']}
        actions={(row) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => togglePin(row.id, row.is_pinned)}
              disabled={loadingId === row.id}
              className={`p-1.5 rounded-lg transition ${row.is_pinned ? 'text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              title={row.is_pinned ? 'Sabitini Kaldır' : 'Sabitle'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            {row.is_deleted ? (
              <button
                onClick={() => handleRestore(row.id)}
                disabled={loadingId === row.id}
                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition"
                title="Geri Al"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => handleDelete(row.id)}
                disabled={loadingId === row.id}
                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      />
    </>
  )
}
