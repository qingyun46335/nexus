import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping";
import { getDb } from "../../utils/sqlite";
import { AdminAboutService } from "../../service/admin/about_service";
import { FriendLink } from "../../type/about";

export type AdminAboutSetEnv = object

export type AdminAboutGetEnv = object

export type AdminAboutBindingsEnv = object & {
    nexus_db: D1Database;
}

export class AdminAboutRoute extends RouteDocs<VarsAndBindingsEnv<AdminAboutSetEnv, AdminAboutGetEnv, AdminAboutBindingsEnv>, AdminAboutSetEnv, AdminAboutGetEnv> {

    private ar: AdminAboutService = new AdminAboutService()

    setRoutePrefix(): string | null {
        return "/about"
    }
    midd(app: Hono<VarsAndBindingsEnv<object, object, AdminAboutBindingsEnv>, BlankSchema, "/">): Result<null> {
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

        r.setDocsMethod(app => {
            app.post("/addFriend", async c => {
                const body = await c.req.parseBody();
                const friendString = body.friend

                const resp = requestParamErrorValidator({ friendString })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const friend = JSON.parse(friendString as string) as FriendLink

                const res = RespMap(
                    await this.ar.addFriend(getDb(c.env), friend)
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.post("/updFriend", async c => {
                const body = await c.req.parseBody();
                const friendString = body.friend
                const id = body.id as string

                const resp = requestParamErrorValidator({ friendString, id })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const friend = JSON.parse(friendString as string) as FriendLink

                const res = RespMap(
                    await this.ar.updFriend(getDb(c.env,), id, friend)
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/delFriend", async c => {
                const body = c.req.query()
                const id = body.id as string

                const resp = requestParamErrorValidator({ id })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.ar.delFriend(getDb(c.env), id)
                )

                return c.json(res?.body, res?.status)
            })
        })
    }

}