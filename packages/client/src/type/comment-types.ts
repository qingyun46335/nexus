// ============================================================
// comment-types.ts — 评论组件的所有类型定义
// ============================================================

export interface SubComment {
  id: string
  content: string | null        // deleted 时为 null
  authorName: string | null     // deleted 时为 null
  authorEmail: string | null    // deleted 时为 null，用于 Gravatar
  createdAt: string             // ISO 8601
  replyTo: string | null        // 被回复者昵称，用于显示"回复 xxx:"
  replyToId: string | null
  deleted: boolean
}

export interface TopCommentString {
  id: string
  content: string | null
  authorName: string | null
  authorEmail: string | null
  createdAt: string
  replyCount: number            // 子评论总数，用于子楼分页
  replies: string         // 默认前 N 条
  deleted: boolean
}

export interface TopComment {
  id: string
  content: string | null
  authorName: string | null
  authorEmail: string | null
  createdAt: string
  replyCount: number            // 子评论总数，用于子楼分页
  replies: SubComment[]         // 默认前 N 条
  deleted: boolean
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// 组件对外派发的事件 payload
export interface CommentSubmitPayload {
  content: string
  authorName: string
  authorEmail: string
  parentId?: string             // 有值 = 子评论
  replyToId?: string
  replyToName?: string          // 被回复者昵称（楼中楼"回复 xxx:"）
}

// 组件公开方法中用于追加成功评论的类型
export type NewTopComment = TopComment
export type NewSubComment = SubComment & { parentId: string }

// 游客信息（存 localStorage）
export interface GuestInfo {
  name: string
  email: string
}

// 表情映射（文本 → Unicode）
export const EMOJI_MAP: Record<string, string> = {
  ':)': '😊',
  ':-)': '😊',
  ':(': '😢',
  ':-(': '😢',
  ':D': '😄',
  ':-D': '😄',
  ':P': '😛',
  ':-P': '😛',
  ';)': '😉',
  ';-)': '😉',
  ':o': '😮',
  ':-o': '😮',
  ':O': '😮',
  ':-O': '😮',
  ':/': '😕',
  ':-/': '😕',
  ':|': '😐',
  ':-|': '😐',
  '>:(': '😠',
  '>:-(': '😠',
  ":'(": '😭',
  ":')": '😂',
  '<3': '❤️',
  '</3': '💔',
  ':+1:': '👍',
  ':-1:': '👎',
  ':star:': '⭐',
  ':fire:': '🔥',
  ':wave:': '👋',
  ':clap:': '👏',
  ':think:': '🤔',
  ':100:': '💯',
}

export function applyEmoji(text: string): string {
  let result = text
  for (const [code, emoji] of Object.entries(EMOJI_MAP)) {
    result = result.split(code).join(emoji)
  }
  return result
}

export function gravatarUrl(email: string | null, size = 40): string {
  if (!email) return `https://www.gravatar.com/avatar/?d=mp&s=${size}`
  const hash = email.trim().toLowerCase()
  return `https://www.gravatar.com/avatar/${encodeURIComponent(hash)}?d=identicon&s=${size}`
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} 小时前`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD} 天前`
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const AVATAR_COLORS = [
  "#F87171", // red
  "#FB923C", // orange
  "#FBBF24", // amber
  "#A3E635", // lime
  "#34D399", // emerald
  "#22D3EE", // cyan
  "#60A5FA", // blue
  "#818CF8", // indigo
  "#A78BFA", // violet
  "#F472B6", // pink
]

function hashString(str: string): number {
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 // 转32位整数
  }

  return Math.abs(hash)
}

export function getAvatarColor(nickname: string): string {
  const hash = hashString(nickname.trim().toLowerCase())
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function getAvatarText(nickname: string): string {
  const name = nickname.trim()

  if (!name) {
    return "?"
  }

  return name[0].toUpperCase()
}
