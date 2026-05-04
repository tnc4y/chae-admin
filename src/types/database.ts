export type UserRole = 'user' | 'premium' | 'moderator' | 'admin'
export type WebtoonStatus = 'ongoing' | 'completed' | 'hiatus' | 'dropped'
export type WebtoonType = 'webtoon' | 'manga' | 'manhwa' | 'manhua'
export type AgeRating = 'all' | 'teen' | 'mature'
export type ReleaseDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type SubscriptionPlan = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial'
export type NotificationType = 'new_chapter' | 'comment_reply' | 'comment_like' | 'system' | 'promotion'
export type ReportReason = 'spam' | 'inappropriate' | 'spoiler' | 'harassment' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  is_active: boolean
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  banned_until: string | null
  coins: number
  total_views: number
  created_at: string
  updated_at: string
}

export interface Author {
  id: string
  name: string
  slug: string
  bio: string | null
  avatar_url: string | null
  social_links: Record<string, string>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Genre {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  icon: string | null
  created_at: string
}

export interface Webtoon {
  id: string
  title: string
  slug: string
  alternative_titles: string[] | null
  description: string | null
  cover_url: string | null
  banner_url: string | null
  author_id: string | null
  artist_id: string | null
  status: WebtoonStatus
  type: WebtoonType
  age_rating: AgeRating
  release_day: ReleaseDay | null
  is_premium: boolean
  is_published: boolean
  is_featured: boolean
  view_count: number
  bookmark_count: number
  chapter_count: number
  avg_rating: number
  rating_count: number
  published_at: string | null
  created_at: string
  updated_at: string
  // joined
  author?: Author
  artist?: Author
  genres?: Genre[]
}

export interface Chapter {
  id: string
  webtoon_id: string
  chapter_number: number
  title: string | null
  slug: string
  description: string | null
  thumbnail_url: string | null
  is_premium: boolean
  is_published: boolean
  view_count: number
  like_count: number
  comment_count: number
  page_count: number
  coin_cost: number
  published_at: string | null
  created_at: string
  updated_at: string
  // joined
  webtoon?: Webtoon
}

export interface ChapterPage {
  id: string
  chapter_id: string
  page_number: number
  image_url: string
  width: number | null
  height: number | null
  file_size: number | null
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  webtoon_id: string
  notify_new_chapter: boolean
  created_at: string
  webtoon?: Webtoon
}

export interface Rating {
  id: string
  user_id: string
  webtoon_id: string
  score: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  user_id: string
  webtoon_id: string
  parent_id: string | null
  content: string
  is_spoiler: boolean
  is_pinned: boolean
  is_deleted: boolean
  deleted_at: string | null
  like_count: number
  reply_count: number
  created_at: string
  updated_at: string
  // joined
  user?: Profile
  webtoon?: Pick<Webtoon, 'id' | 'title' | 'slug' | 'cover_url'>
  replies?: Comment[]
}

export interface ChapterComment {
  id: string
  user_id: string
  chapter_id: string
  parent_id: string | null
  content: string
  is_spoiler: boolean
  is_pinned: boolean
  is_deleted: boolean
  deleted_at: string | null
  like_count: number
  reply_count: number
  created_at: string
  updated_at: string
  user?: Profile
  chapter?: Pick<Chapter, 'id' | 'chapter_number' | 'title' | 'webtoon_id'>
}

export interface CommentLike {
  id: string
  user_id: string
  comment_id: string
  created_at: string
}

export interface ChapterLike {
  id: string
  user_id: string
  chapter_id: string
  created_at: string
}

export interface ReadingHistory {
  id: string
  user_id: string
  webtoon_id: string
  chapter_id: string
  last_page: number
  progress: number
  last_read_at: string
  created_at: string
  chapter?: Chapter
  webtoon?: Pick<Webtoon, 'id' | 'title' | 'slug' | 'cover_url'>
}

export interface ChapterUnlock {
  id: string
  user_id: string
  chapter_id: string
  coins_spent: number
  unlocked_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  started_at: string
  expires_at: string
  cancelled_at: string | null
  payment_id: string | null
  created_at: string
  updated_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  comment_id: string | null
  chapter_comment_id: string | null
  webtoon_id: string | null
  created_at: string
  updated_at: string
  reporter?: Profile
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  balance: number
  reason: string
  data: Record<string, unknown>
  created_at: string
}

export interface SiteSetting {
  key: string
  value: unknown
  description: string | null
  updated_at: string
  updated_by: string | null
}

// ---- Supabase Database type (for typed client) ----

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      authors: { Row: Author; Insert: Partial<Author>; Update: Partial<Author> }
      genres: { Row: Genre; Insert: Partial<Genre>; Update: Partial<Genre> }
      webtoons: { Row: Webtoon; Insert: Partial<Webtoon>; Update: Partial<Webtoon> }
      chapters: { Row: Chapter; Insert: Partial<Chapter>; Update: Partial<Chapter> }
      chapter_pages: { Row: ChapterPage; Insert: Partial<ChapterPage>; Update: Partial<ChapterPage> }
      favorites: { Row: Favorite; Insert: Partial<Favorite>; Update: Partial<Favorite> }
      ratings: { Row: Rating; Insert: Partial<Rating>; Update: Partial<Rating> }
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> }
      chapter_comments: { Row: ChapterComment; Insert: Partial<ChapterComment>; Update: Partial<ChapterComment> }
      comment_likes: { Row: CommentLike; Insert: Partial<CommentLike>; Update: Partial<CommentLike> }
      chapter_likes: { Row: ChapterLike; Insert: Partial<ChapterLike>; Update: Partial<ChapterLike> }
      reading_history: { Row: ReadingHistory; Insert: Partial<ReadingHistory>; Update: Partial<ReadingHistory> }
      chapter_unlocks: { Row: ChapterUnlock; Insert: Partial<ChapterUnlock>; Update: Partial<ChapterUnlock> }
      subscriptions: { Row: Subscription; Insert: Partial<Subscription>; Update: Partial<Subscription> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      reports: { Row: Report; Insert: Partial<Report>; Update: Partial<Report> }
      coin_transactions: { Row: CoinTransaction; Insert: Partial<CoinTransaction>; Update: Partial<CoinTransaction> }
      site_settings: { Row: SiteSetting; Insert: Partial<SiteSetting>; Update: Partial<SiteSetting> }
    }
  }
}

// ---- Dashboard stats type ----
export interface DashboardStats {
  totalUsers: number
  totalWebtoons: number
  totalChapters: number
  totalComments: number
  totalViews: number
  activeSubscriptions: number
  newUsersToday: number
  pendingReports: number
}
