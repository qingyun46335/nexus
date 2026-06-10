import { Hono } from "hono"
import { BlankSchema } from "hono/types"
import { Ok, Result } from "../../utils/result"
import { VarsAndBindingsEnv } from "../route"
import { RouteDocs } from "../route_docs"
import { TagService } from "../../service/client/tag_service"
import { getDb } from "../../utils/sqlite"
import { RespMap } from "../../utils/response_mapping"


export type TagSetEnv = {} & object

export type TagGetEnv = {} & object

export type TagBindingsEnv = {
    nexus_db: D1Database;
} & object

export class TagRoute extends RouteDocs<VarsAndBindingsEnv<TagSetEnv, TagGetEnv, TagBindingsEnv>, TagSetEnv, TagGetEnv> {

    private ts: TagService = new TagService()

    setRoutePrefix(): string | null {
        return "/tag"
    }
    midd(app: Hono<VarsAndBindingsEnv<TagSetEnv, TagGetEnv, TagBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/getTags", async c => {
                const res = await this.ts.selectTags(getDb(c.env))

                const re = RespMap(res)

                return c.json(re?.body, re?.status)
            })
        })
    }

}