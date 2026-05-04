'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/admin/DataTable'
import { formatDateTime } from '@/lib/utils'
import { CheckCircle, XCircle } from 'lucide-react'
import type { ReportReason, ReportStatus } from '@/types/database'

interface ReportRow {
  id: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  created_at: string
  reporter: { username: string; display_name: string | null } | null
}

const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  inappropriate: 'Uygunsuz',
  spoiler: 'Spoiler',
  harassment: 'Taciz',
  other: 'Diğer',
}

const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
  dismissed: 'bg-slate-700 text-slate-400',
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Bekliyor',
  reviewed: 'İncelendi',
  resolved: 'Çözüldü',
  dismissed: 'Reddedildi',
}

export default function ReportsClient({ reports }: { reports: ReportRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending')

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  async function updateStatus(id: string, status: ReportStatus) {
    setLoadingId(id)
    await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    router.refresh()
    setLoadingId(null)
  }

  const columns: Column<ReportRow>[] = [
    {
      key: 'reporter',
      label: 'Şikayet Eden',
      render: (_, row) => (
        <span className="text-slate-300 text-sm">@{row.reporter?.username ?? '?'}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Sebep',
      render: (v) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          {REASON_LABELS[v as ReportReason]}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Açıklama',
      render: (v) => <span className="text-slate-400 text-xs">{(v as string) || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Durum',
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v as ReportStatus]}`}>
          {STATUS_LABELS[v as ReportStatus]}
        </span>
      ),
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
        {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-xl transition ${
              filter === f
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                : 'text-slate-400 hover:text-white border border-transparent hover:border-slate-700'
            }`}
          >
            {f === 'all' ? 'Tümü' : STATUS_LABELS[f as ReportStatus]}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        pageSize={25}
        actions={(row) => (
          row.status === 'pending' ? (
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => updateStatus(row.id, 'resolved')}
                disabled={loadingId === row.id}
                className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition"
                title="Çözüldü"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateStatus(row.id, 'dismissed')}
                disabled={loadingId === row.id}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                title="Reddet"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null
        )}
      />
    </>
  )
}
