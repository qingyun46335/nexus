import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { articleToTag, tag } from "../../db/schema";
import { ErrFrom, Ok, Result } from "../../utils/result";
import { count, eq, inArray } from "drizzle-orm";
import { Tag } from "../../type/tag";
import { CustomError } from "../../error/error";

export class TagService {

    public async selectTags(db: DrizzleD1Database<typeof schema>, tagStatus?: "active" | "inactive" | null,): Promise<Result<Tag[]>> {
        const tags = await db.query.tag.findMany({
            where: ((tag, { and, eq }) => and(
                tagStatus ? eq(tag.status, tagStatus) : undefined
            ))
        })
        return Ok(tags)
    }

    public async getArticleToTagIds(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<string[]>> {
        const tags = await db.query.articleToTag.findMany({
            where: eq(articleToTag.articleId, articleId)
        })
        return Ok(tags.map(tag => tag.tagId))
    }

    public async addTag(db: DrizzleD1Database<typeof schema>, tagString: string): Promise<Result<string>> {
        const id = crypto.randomUUID()
        await db.insert(tag).values({
            id: id,
            name: tagString,
            count: 0,
            status: "active",
            views: 0,
        })
        return Ok(id)
    }

    public async updTagStatus(db: DrizzleD1Database<typeof schema>, tagStatus: "active" | "inactive", tagId: string): Promise<Result<null>> {
        await db.update(tag).set({
            status: tagStatus,
        }).where(eq(tag.id, tagId))
        return Ok(null)
    }

    public async delTag(db: DrizzleD1Database<typeof schema>, tagIds: string[]): Promise<Result<null>> {

        const total = await db.select({ count: count() }).from(articleToTag).where(inArray(articleToTag.tagId, tagIds))

        if (total[0].count > 0) {
            return ErrFrom(CustomError, "标签存在使用，请先删除文章对该标签使用，再进行删除")
        }

        await db.delete(tag).where(inArray(tag.id, tagIds))
        return Ok(null)
    }
}