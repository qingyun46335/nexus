import { DrizzleD1Database } from "drizzle-orm/d1";
import { FriendLink } from "../../type/about";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import * as schema from "../../db/schema";
import { DBError } from "../../error/error";

export class AboutService {
    public async getFriends(db: DrizzleD1Database<typeof schema>,): Promise<Result<FriendLink[]>> {
        const res = await to(db.query.friendLink.findMany())

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(res.v)
    }
}