import { createClient } from '@/lib/supabase/server'
import Header from '@/components/admin/Header'
import StatsCard from '@/components/admin/StatsCard'
import { formatNumber, formatDateTime } from '@/lib/utils'
import {
  Users,
  BookMarked,
  BookOpen,
  MessageSquare,
  Eye,
  CreditCard,
  UserPlus,
  Flag,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Parallel queries for stats
  const [
    { count: totalUsers },
    { count: totalWebtoons },
    { count: totalChapters },
    { count: totalComments },
    { count: activeSubscriptions },
    { count: pendingReports },
    { data: webtoonStats },
    { data: recentUsers },
    { data: recentWebtoons },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('webtoons').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('webtoons').select('view_count').order('view_count', { ascending: false }).limit(1),
    supabase.from('profiles').select('id, username, display_name, role, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('webtoons').select('id, title, cover_url, chapter_count, view_count, status, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: newUsersToday } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString())

  const stats = [
    { title: 'Toplam Kullanıcı', value: formatNumber(totalUsers ?? 0), icon: Users, color: 'violet' as const, change: `+${newUsersToday ?? 0} bugün`, changeType: 'up' as const },
    { title: 'Webtoon', value: formatNumber(totalWebtoons ?? 0), icon: BookMarked, color: 'blue' as const },
    { title: 'Bölüm', value: formatNumber(totalChapters ?? 0), icon: BookOpen, color: 'green' as const },
    { title: 'Yorum', value: formatNumber(totalComments ?? 0), icon: MessageSquare, color: 'orange' as const },
    { title: 'Görüntülenme', value: formatNumber(webtoonStats?.[0]?.view_count ?? 0), icon: Eye, color: 'pink' as const },
    { title: 'Aktif Abonelik', value: formatNumber(activeSubscriptions ?? 0), icon: CreditCard, color: 'green' as const },
    { title: 'Yeni Üye (Bugün)', value: newUsersToday ?? 0, icon: UserPlus, color: 'violet' as const },
    { title: 'Bekleyen Şikayet', value: pendingReports ?? 0, icon: Flag, color: 'red' as const, change: pendingReports ? 'İnceleme bekliyor' : undefined, changeType: pendingReports ? 'down' as const : 'neutral' as const },
  ]

  const roleColor: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400',
    moderator: 'bg-orange-500/20 text-orange-400',
    premium: 'bg-violet-500/20 text-violet-400',
    user: 'bg-slate-700 text-slate-400',
  }

  const statusColor: Record<string, string> = {
    ongoing: 'bg-green-500/20 text-green-400',
    completed: 'bg-blue-500/20 text-blue-400',
    hiatus: 'bg-yellow-500/20 text-yellow-400',
    dropped: 'bg-red-500/20 text-red-400',
  }

  return (
    <>
      <Header title="Dashboard" subtitle="Platforma genel bakış" />
      <main className="flex-1 p-6 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatsCard key={s.title} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Son Kayıt Olan Kullanıcılar</h2>
              <a href="/admin/users" className="text-violet-400 text-xs hover:text-violet-300 transition">Tümü →</a>
            </div>
            <div className="divide-y divide-slate-800">
              {recentUsers?.map((user) => (
                <div key={user.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold uppercase">
                      {(user.display_name ?? user.username)?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.display_name ?? user.username}</p>
                    <p className="text-slate-500 text-xs">{formatDateTime(user.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role]}`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Webtoons */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Son Eklenen Webtoonlar</h2>
              <a href="/admin/webtoons" className="text-violet-400 text-xs hover:text-violet-300 transition">Tümü →</a>
            </div>
            <div className="divide-y divide-slate-800">
              {recentWebtoons?.map((w) => (
                <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                  {w.cover_url ? (
                    <img src={w.cover_url} alt={w.title} className="w-8 h-10 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-10 bg-slate-800 rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{w.title}</p>
                    <p className="text-slate-500 text-xs">{w.chapter_count} bölüm · {formatNumber(w.view_count)} görüntülenme</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[w.status]}`}>
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </>
  )
}
