import { DrizzleD1Database } from "drizzle-orm/d1";
import { FriendLinkVo } from "../../type/about";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import * as schema from "../../db/schema";
import { DBError } from "../../error/error";
import { eq } from "drizzle-orm";

export class AboutService {
    public async getFriends(db: DrizzleD1Database<typeof schema>,): Promise<Result<FriendLinkVo[]>> {
        const res = await to(db.select({
            id: schema.friendLink.id,
            name: schema.friendLink.name,         // 站名
            url: schema.friendLink.avatar,         // 链接
            avatar: schema.friendLink.avatar,      // 头像/favicon URL
            description: schema.friendLink.description, // 一句话介绍
            author: schema.friendLink.author,      // 作者名
        }).from(schema.friendLink).where(eq(schema.friendLink.status, 1)))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(res.v)
    }
}