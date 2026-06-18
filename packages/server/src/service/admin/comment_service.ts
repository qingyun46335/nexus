import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import { desc, eq, sql } from "drizzle-orm";
import { DBError } from "../../error/error";
import { CommentStatus, CommentSubmitPayload } from "../../type/comment";
import { formatHKTime } from "../../utils/time";

export class AdminCommentService {
    public async getComments(db: DrizzleD1Database<typeof schema>, page: number, pageSize: number, q?: string,) {

        let s = sql` 1 = 1 `

        if (q) {
            const likeKeyword = `%${q}%`;
            s = sql` id like ${likeKeyword} or content like ${likeKeyword} or author_email like ${likeKeyword} or reply_to_id like ${likeKeyword}`
        }

        const res = await to(db.select().from(schema.comment).where(s).orderBy(desc(schema.comment.createdAt)).limit(pageSize).offset((page - 1) * pageSize))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        const res1 = await to(db.$count(schema.comment))

        if (res1.e) {
            return ErrFrom(DBError, "数据库异常", res1.e)
        }

        return Ok({ data: res.v, total: res1.v, page: page, pageSize: pageSize })
    }

    public async addComment(db: DrizzleD1Database<typeof schema>, c: CommentSubmitPayload): Promise<Result<null>> {
        let parentId: string | null = null
        let replyTo: string | null = null

        if (c.replyToId) {
            const res1 = await to(db.query.comment.findFirst({
                where: eq(schema.comment.id, c.replyToId)
            }))

            if (res1.e) {
                return ErrFrom(DBError, "数据库异常", res1.e)
            }

            if (res1.v && res1.v.replyToId) {
                parentId = res1.v.parentId
            } else if (res1.v && !res1.v.replyToId) {
                parentId = res1.v.id
            }

            replyTo = res1.v?.authorName ?? null
        }

        const res = await to(db.insert(schema.comment).values({
            id: crypto.randomUUID(),
            content: c.content,
            authorName: c.authorName,
            authorEmail: c.authorEmail,
            createdAt: formatHKTime(new Date().toISOString()),
            replyTo: c.replyToName ?? replyTo ?? null,  // 回复者昵称，顶层评论为空白字符串
            replyToId: c.replyToId ?? null,  // 回复者id，顶层评论为空
            deleted: 0,  // 1 删除，0 未删除
            parentId: parentId,  // 所属顶层id，顶层评论则为空
            role: c.role,  // 目前主要应用于徽章展示
        }))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(null)
    }

    public async updComment(db: DrizzleD1Database<typeof schema>, id: string, c: CommentStatus): Promise<Result<null>> {

        const o: CommentStatus = {
            deleted: 0,
            role: "guest"
        }

        if (c.deleted) {
            o.deleted = c.deleted ? 1 : 0
        } else if (c.role) {
            o.role = c.role
        }

        const res = await to(db.update(schema.comment).set(o).where(eq(schema.comment.id, id)))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(null)
    }
}