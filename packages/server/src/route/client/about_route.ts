import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { AboutService } from "../../service/client/about_service";
import { getDb } from "../../utils/sqlite";
import { RespMap } from "../../utils/response_mapping";

export type AboutSetEnv = object

export type AboutGetEnv = object

export type AboutBindingsEnv = object & {
    nexus_db: D1Database;
}

export class AboutRoute extends RouteDocs<VarsAndBindingsEnv<AboutSetEnv, AboutGetEnv, AboutBindingsEnv>, AboutSetEnv, AboutGetEnv> {

    private ar: AboutService = new AboutService()

    setRoutePrefix(): string | null {
        return "/about"
    }
    midd(app: Hono<VarsAndBindingsEnv<object, object, AboutBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/getFriends", async c => {
                const res = RespMap(
                    await this.ar.getFriends(getDb(c.env))
                )

                return c.json(res?.body, res?.status)
            })
        })
    }

}