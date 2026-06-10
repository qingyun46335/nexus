import { DrizzleD1Database } from "drizzle-orm/d1"
import * as schema from "../../db/schema";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import { TagClientVo } from "../../type/tag";
import { ContentNotFoundBusinessError, DBError } from "../../error/error";

export class TagService {

    public async selectTags(db: DrizzleD1Database<typeof schema>,): Promise<Result<TagClientVo[]>> {
        const tags = await to(db.query.tag.findMany({
            where: ((tag, { and, eq }) => and(
                eq(tag.status, "active")
            ))
        }))

        if (tags.e) {
            return ErrFrom(DBError, "数据库查询失败", tags.e)
        }

        if (tags.v != null && tags.v.length > 0) {
            return Ok(tags.v)
        }
        return ErrFrom(ContentNotFoundBusinessError, "无内容")
    }

}