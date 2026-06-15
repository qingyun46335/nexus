import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { CommentService } from "../../service/client/comment_service";
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping";
import { CommentSubmitPayload } from "../../type/comment";
import { getDb } from "../../utils/sqlite";

export type CommentSetEnv = object

export type CommentGetEnv = object

export type CommentBindingsEnv = object & {
    nexus_db: D1Database;
    NEXUS_FILE_BUCKET: R2Bucket;
}

export class CommentRoute extends RouteDocs<VarsAndBindingsEnv<CommentSetEnv, CommentGetEnv, CommentBindingsEnv>, CommentSetEnv, CommentGetEnv> {

    private cs: CommentService = new CommentService()

    setRoutePrefix(): string | null {
        return "/comment"
    }
    midd(app: Hono<VarsAndBindingsEnv<object, object, CommentBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.post("/addComment", async c => {
                const body = await c.req.parseBody();
                const commentString = body.comment

                const resp = requestParamErrorValidator({ commentString });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const comment = JSON.parse(commentString as string) as CommentSubmitPayload

                const res = RespMap(
                    await this.cs.addTopComment(getDb(c.env), comment)
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/getTopComments", async c => {
                const body = c.req.query()
                const page = body.page
                const pageSize = body.pageSize

                const resp = requestParamErrorValidator({ page, pageSize })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.cs.getTopComments(getDb(c.env), Number(page), Number(pageSize))
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/getSubComments", async c => {
                const body = c.req.query()
                const parentId = body.parentId
                const page = body.page
                const pageSize = body.pageSize

                const resp = requestParamErrorValidator({ parentId, page, pageSize })

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.cs.getSubComments(getDb(c.env), parentId, Number(page), Number(pageSize))
                )

                return c.json(res?.body, res?.status)
            })
        })
    }

}