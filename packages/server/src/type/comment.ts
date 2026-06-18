export interface SubComment {
    id: string
    content: string | null        // deleted 时为 null
    authorName: string | null     // deleted 时为 null
    // authorEmail: string | null    // deleted 时为 null，用于 Gravatar
    replyTo: string | null        // 被回复者昵称，用于显示"回复 xxx:"
    replyToId: string | null
    deleted: boolean
    role: "admin" | "guest"
}

export interface TopComment {
    id: string
    content: string | null
    authorName: string | null
    // authorEmail: string | null
    createdAt: string
    replyCount: number            // 子评论总数，用于子楼分页
    replies: SubComment[]         // 默认前 N 条
    deleted: boolean
    role: "admin" | "guest"
}

export interface CommentStatus {
    deleted: 1 | 0
    role: "admin" | "guest"
}

export interface CommentSubmitPayload {
    content: string
    authorName: string
    authorEmail: string
    parentId?: string             // 有值 = 子评论
    replyToId?: string
    replyToName?: string          // 被回复者昵称（楼中楼"回复 xxx:"）
    role: "admin" | "guest"
}

export interface PagedResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
}