import { CommentSubmitPayload, PagedResult, SubComment, TopComment } from "../../type/comment";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import * as schema from "../../db/schema";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { formatHKTime } from "../../utils/time";
import { DataError, DataNotFindError, DataValidateError, DBError } from "../../error/error";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export class CommentService {
    public async addTopComment(db: DrizzleD1Database<typeof schema>, c: CommentSubmitPayload): Promise<Result<TopComment & SubComment>> {

        const authorName = c.authorName.trim()
        const authorEmail = c.authorEmail.trim().toLowerCase()
        const content = c.content.trim()

        if (content.length === 0) {
            return ErrFrom(DataError, "评论内容为空")
        }

        if (content.length > 500) {
            return ErrFrom(DataError, "评论内容过长")
        }

        // 邮箱、昵称 检验
        const nicknameReg =
            /^[\u4e00-\u9fa5a-zA-Z0-9]{1,20}$/;
        if (!nicknameReg.test(authorName)) {
            return ErrFrom(DataValidateError, "昵称不符合要求")
        }

        const emailReg =
            /^[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}$/;
        if (!emailReg.test(authorEmail)) {
            return ErrFrom(DataValidateError, "邮箱不符合要求")
        }

        // xss检测
        const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(content);
        if (hasHtmlTag) {
            return ErrFrom(DataValidateError, "评论内容不符合要求")
        }

        // 敏感词检测

        let replyToName = ""
        if (c.parentId && c.replyToId) {
            const res1 = await to(db.query.comment.findFirst({
                where: eq(schema.comment.id, c.parentId)
            }))
            if (res1.e) {
                return ErrFrom(DBError, "数据库异常", res1.e)

            }
            if (!res1.v) {
                return ErrFrom(DataNotFindError, "数据库不存在行")
            }

            const res2 = await to(db.query.comment.findFirst({
                where: eq(schema.comment.id, c.replyToId)
            }))
            if (res2.e) {
                return ErrFrom(DBError, "数据库异常", res2.e)

            }
            if (!res2.v) {
                return ErrFrom(DataNotFindError, "数据库不存在行")
            }
            replyToName = res2.v.authorName
        }

        const id = crypto.randomUUID()
        const date = formatHKTime(new Date().toISOString())
        const res = await to(db.insert(schema.comment).values({
            id: id,
            content: content,
            authorName: authorName,
            authorEmail: authorEmail,
            createdAt: date,
            replyTo: replyToName ?? null,
            replyToId: c.replyToId ?? null,
            deleted: 0,
            parentId: c.parentId ?? null,
            role: "guest",
        }))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常")
        }

        return Ok({
            id: id,
            content: content,
            authorName: authorName,
            authorEmail: authorEmail,
            createdAt: date,
            replyTo: replyToName ?? null,
            replyToId: c.replyToId ?? null,
            replyCount: 0,
            replies: [],
            deleted: false,
            parentId: c.parentId ?? null,
            role: "guest"
        })
    }

    public async getTopComments(db: DrizzleD1Database<typeof schema>, page: number, pageSize: number,): Promise<Result<PagedResult<TopComment>>> {
        const subLimit = 5
        const res = await to(db.select({
            id: schema.comment.id,
            content: sql<string>`
                CASE
                    WHEN ${schema.comment.deleted} = 1
                    THEN ''
                    ELSE ${schema.comment.content}
                END
            `,
            authorName: sql<string>`
                CASE
                    WHEN ${schema.comment.deleted} = 1
                    THEN ''
                    ELSE ${schema.comment.authorName}
                END
            `,
            createdAt: schema.comment.createdAt,
            replyCount: sql<number>`
            (
                select count(1) from comment c2 where c2.parent_id = comment.id
            )
            `,
            replies: sql<SubComment[]>`
            (
                SELECT json_group_array(
                    json_object(
                        'id', c2.id,
                        'content', c2.content,
                        'authorName', c2.author_name,
                        'createdAt', c2.created_at, 
                        'replyTo', c2.reply_to, 
                        'replyToId', c2.reply_to_id, 
                        'deleted', c2.deleted = 1, 
                        'role', CASE
                            WHEN c2.deleted = 1
                            THEN 'guest'
                            ELSE c2.role
                        END 
                    )
                )
                FROM comment c2
                WHERE c2.parent_id = comment.id
                ORDER BY c2.created_at desc
                LIMIT ${subLimit}
            )
            `,
            deleted: sql<boolean>` ${schema.comment.deleted} `,
            role: sql<"admin" | "guest">`
                CASE
                    WHEN ${schema.comment.deleted} = 1
                    THEN 'guest'
                    ELSE ${schema.comment.role}
                END
            `,
        }).from(schema.comment).where(and(isNull(schema.comment.parentId), eq(schema.comment.deleted, 0))).orderBy(desc(schema.comment.createdAt)).limit(pageSize).offset((page - 1) * pageSize))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        const res1 = await to(db.$count(schema.comment, isNull(schema.comment.parentId)))

        if (res1.e) {
            return ErrFrom(DBError, "数据库异常", res1.e)
        }

        return Ok({
            items: res.v,
            total: res1.v,
            page: page,
            pageSize: pageSize,
        })
    }

    public async getSubComments(db: DrizzleD1Database<typeof schema>, parentId: string, page: number, pageSize: number,): Promise<Result<PagedResult<SubComment>>> {
        const res = await to(db.select({
            id: schema.comment.id,
            content: schema.comment.content,         // deleted 时为 null
            authorName: schema.comment.authorName,      // deleted 时为 null
            replyTo: schema.comment.replyTo,         // 被回复者昵称，用于显示"回复 xxx:"
            replyToId: schema.comment.replyToId,
            deleted: sql<boolean>` ${schema.comment.deleted}`,
            role: sql<"admin" | "guest">`
                CASE
                    WHEN ${schema.comment.deleted} = 1
                    THEN 'guest'
                    ELSE ${schema.comment.role}
                END
            `,
        }).from(schema.comment).where(eq(schema.comment.parentId, parentId)).orderBy(desc(schema.comment.createdAt)).limit(pageSize).offset((page - 1) * pageSize))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        const res1 = await to(db.$count(schema.comment, eq(schema.comment.parentId, parentId)))

        if (res1.e) {
            return ErrFrom(DBError, "数据库异常", res1.e)
        }

        return Ok({
            items: res.v,
            total: res1.v,
            page: page,
            pageSize: pageSize,
        })
    }
}