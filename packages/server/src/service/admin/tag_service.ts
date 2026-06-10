import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { articleToTag, tag } from "../../db/schema";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import { count, eq, inArray } from "drizzle-orm";
import { Tag } from "../../type/tag";
import { CustomError, DBError } from "../../error/error";

export class AdminTagService {

    public async selectTags(db: DrizzleD1Database<typeof schema>, tagStatus?: "active" | "inactive" | null,): Promise<Result<Tag[]>> {
        const tags = await to(db.query.tag.findMany({
            where: ((tag, { and, eq }) => and(
                tagStatus ? eq(tag.status, tagStatus) : undefined
            ))
        }))

        if (tags.e) {
            return ErrFrom(DBError, "数据库错误", tags.e)
        }

        return Ok(tags.v)
    }

    public async getArticleToTagIds(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<string[]>> {
        const tags = await to(db.query.articleToTag.findMany({
            where: eq(articleToTag.articleId, articleId)
        }))

        if (tags.e) {
            return ErrFrom(DBError, "数据库错误", tags.e)
        }

        return Ok(tags.v.map(tag => tag.tagId))
    }

    public async addTag(db: DrizzleD1Database<typeof schema>, tagString: string): Promise<Result<string>> {
        const id = crypto.randomUUID()
        const res = await to(db.insert(tag).values({
            id: id,
            name: tagString,
            count: 0,
            status: "active",
            views: 0,
        }))

        if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
        }

        return Ok(id)
    }

    public async updTagStatus(db: DrizzleD1Database<typeof schema>, tagStatus: "active" | "inactive", tagId: string): Promise<Result<null>> {
        const res = await to(db.update(tag).set({
            status: tagStatus,
        }).where(eq(tag.id, tagId)))
        if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
        }
        return Ok(null)
    }

    public async delTag(db: DrizzleD1Database<typeof schema>, tagIds: string[]): Promise<Result<null>> {

        const total = await to(db.select({ count: count() }).from(articleToTag).where(inArray(articleToTag.tagId, tagIds)))

        if (total.e) {
            return ErrFrom(DBError, "数据库错误", total.e)
        }

        if (total.v[0].count > 0) {
            return ErrFrom(CustomError, "标签存在使用，请先删除文章对该标签使用，再进行删除")
        }

        const res = await to(db.delete(tag).where(inArray(tag.id, tagIds)))
        if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
        }
        return Ok(null)
    }
}