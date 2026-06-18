import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping";
import { getDb } from "../../utils/sqlite";
import { AdminCommentService } from "../../service/admin/comment_service";
import { CommentStatus, CommentSubmitPayload } from "../../type/comment";

export type AdminCommentSetEnv = object

export type AdminCommentGetEnv = object

export type AdminCommentBindingsEnv = object & {
    nexus_db: D1Database;
}

export class AdminCommentRoute extends RouteDocs<VarsAndBindingsEnv<AdminCommentSetEnv, AdminCommentGetEnv, AdminCommentBindingsEnv>, AdminCommentSetEnv, AdminCommentGetEnv> {

    private cs: AdminCommentService = new AdminCommentService()

    setRoutePrefix(): string | null {
        return "/comment"
    }
    midd(app: Hono<VarsAndBindingsEnv<object, object, AdminCommentBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/getComments", async c => {
                const body = c.req.query()
                const page = body.page
                const pageSize = body.pageSize
                const q = body.q

                const resp = requestParamErrorValidator({ page, pageSize, })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.cs.getComments(getDb(c.env), Number(page), Number(pageSize), q)
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.post("/addComment", async c => {
                const body = await c.req.parseBody();
                const cString = body.c

                const resp = requestParamErrorValidator({ cString, })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const c0 = JSON.parse(cString as string) as CommentSubmitPayload

                const res = RespMap(
                    await this.cs.addComment(getDb(c.env), c0)
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.post("/updComment", async c => {
                const body = await c.req.parseBody();
                const id = body.id
                const cString = body.c

                const resp = requestParamErrorValidator({ id, cString, })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const c0 = JSON.parse(cString as string) as CommentStatus

                const res = RespMap(
                    await this.cs.updComment(getDb(c.env), String(id), c0)
                )

                return c.json(res?.body, res?.status)
            })
        })
    }

}