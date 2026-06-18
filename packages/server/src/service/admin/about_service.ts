import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../db/schema";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import { eq } from "drizzle-orm";
import { DataNotFindError, DBError } from "../../error/error";
import { FriendLink } from "../../type/about";

export class AdminAboutService {
    public async getFriends(db: DrizzleD1Database<typeof schema>,): Promise<Result<FriendLink[]>> {
        const res = await to(db.select().from(schema.friendLink))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(res.v)
    }

    public async addFriend(db: DrizzleD1Database<typeof schema>, f: FriendLink): Promise<Result<FriendLink>> {

        const f0: FriendLink = {
            id: crypto.randomUUID(),
            name: f.name,
            description: f.description,
            url: f.url,
            author: f.author,
            avatar: f.avatar ?? "",
            status: f.status === 1 ? 1 : 0,
        }

        const res = await to(db.insert(schema.friendLink).values(f0))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(f0)
    }

    public async updFriend(db: DrizzleD1Database<typeof schema>, id: string, f: FriendLink): Promise<Result<FriendLink>> {
        const f0: FriendLink = {
            id: f.id,
            name: f.name,
            description: f.description,
            url: f.url,
            author: f.author,
            avatar: f.avatar ?? "",
            status: f.status === 1 ? 1 : 0,
        }

        const res = await to(db.update(schema.friendLink).set(f0).where(eq(schema.friendLink.id, id)))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        return Ok(f0)
    }

    public async delFriend(db: DrizzleD1Database<typeof schema>, id: string,): Promise<Result<null>> {
        const res = await to(db.$count(schema.friendLink, eq(schema.friendLink.id, id)))

        if (res.e) {
            return ErrFrom(DBError, "数据库异常", res.e)
        }

        if (res.v === 0) {
            return ErrFrom(DataNotFindError, "无法找到需要删除的友链")
        }

        const res1 = await to(db.delete(schema.friendLink).where(eq(schema.friendLink.id, id)))

        if (res1.e) {
            return ErrFrom(DBError, "数据库异常", res1.e)
        }

        return Ok(null)
    }
}