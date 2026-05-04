'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DataTable, { Column } from '@/components/admin/DataTable'
import { formatDate } from '@/lib/utils'
import { ShieldCheck, Ban, CheckCircle } from 'lucide-react'
import type { Profile, UserRole } from '@/types/database'

type UserRow = Pick<Profile, 'id' | 'username' | 'display_name' | 'role' | 'is_active' | 'is_banned' | 'coins' | 'created_at' | 'updated_at'>

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border border-red-500/20',
  moderator: 'bg-orange-500/20 text-orange-400 border border-orange-500/20',
  premium: 'bg-violet-500/20 text-violet-400 border border-violet-500/20',
  user: 'bg-slate-700 text-slate-400',
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  moderator: 'Moderatör',
  premium: 'Premium',
  user: 'Kullanıcı',
}

export default function UsersClient({ users }: { users: UserRow[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function updateRole(userId: string, role: UserRole) {
    setLoadingId(userId)
    await supabase.from('profiles').update({ role }).eq('id', userId)
    router.refresh()
    setLoadingId(null)
  }

  async function toggleBan(user: UserRow) {
    setLoadingId(user.id)
    await supabase.from('profiles').update({ is_banned: !user.is_banned }).eq('id', user.id)
    router.refresh()
    setLoadingId(null)
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'username',
      label: 'Kullanıcı',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold uppercase">
              {(row.display_name ?? row.username)?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">{row.display_name ?? row.username}</p>
            <p className="text-slate-500 text-xs">@{row.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rol',
      render: (_, row) => (
        <select
          value={row.role}
          onChange={e => updateRole(row.id, e.target.value as UserRole)}
          disabled={loadingId === row.id}
          className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500 disabled:opacity-50"
        >
          <option value="user">Kullanıcı</option>
          <option value="premium">Premium</option>
          <option value="moderator">Moderatör</option>
          <option value="admin">Admin</option>
        </select>
      ),
    },
    {
      key: 'is_banned',
      label: 'Durum',
      render: (_, row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${row.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {row.is_banned ? 'Banlı' : 'Aktif'}
        </span>
      ),
    },
    {
      key: 'coins',
      label: 'Coin',
      render: (v) => <span className="text-yellow-400 text-sm font-medium">{v as number}</span>,
    },
    {
      key: 'created_at',
      label: 'Kayıt',
      render: (v) => <span className="text-slate-500 text-xs">{formatDate(v as string)}</span>,
    },
  ]

  return (
    <DataTable
      data={users}
      columns={columns}
      searchPlaceholder="Kullanıcı ara..."
      searchKeys={['username', 'display_name']}
      actions={(row) => (
        <button
          onClick={() => toggleBan(row)}
          disabled={loadingId === row.id}
          className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
            row.is_banned
              ? 'text-green-400 hover:bg-green-500/10'
              : 'text-red-400 hover:bg-red-500/10'
          }`}
          title={row.is_banned ? 'Banı Kaldır' : 'Banla'}
        >
          {row.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        </button>
      )}
    />
  )
}
