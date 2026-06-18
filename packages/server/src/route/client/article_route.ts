import { Hono } from "hono"
import { BlankSchema } from "hono/types"
import { Ok, Result } from "../../utils/result"
import { VarsAndBindingsEnv } from "../route"
import { RouteDocs } from "../route_docs"
import { ArticleService } from "../../service/client/article_service"
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping"
import { getDb } from "../../utils/sqlite"


export type ArticleSetEnv = object

export type ArticleGetEnv = object

export type ArticleBindingsEnv = object & {
    nexus_db: D1Database;
    NEXUS_FILE_BUCKET: R2Bucket;
}

export class ArticleRoute extends RouteDocs<VarsAndBindingsEnv<ArticleSetEnv, ArticleGetEnv, ArticleBindingsEnv>, ArticleSetEnv, ArticleGetEnv> {

    private as: ArticleService = new ArticleService()

    setRoutePrefix(): string | null {
        return "/article"
    }
    midd(app: Hono<VarsAndBindingsEnv<ArticleSetEnv, ArticleGetEnv, ArticleBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/getArticles", async c => {
                const body = c.req.query()
                const page = body.page
                const pageSize = body.pageSize
                const tag = body.tag
                const q = body.q

                const resp = requestParamErrorValidator({ page, pageSize, });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const result = await this.as.getArticleList(getDb(c.env), Number(page), Number(pageSize), q, tag)

                const res = RespMap(result);

                return c.json(res?.body, res?.status);
            })
        })
        r.setDocsMethod(app => {
            app.get("/hotArticles", async c => {
                const body = c.req.query()
                const limit = body.limit

                const resp = requestParamErrorValidator({ limit });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const result = await this.as.getHotArticleList(getDb(c.env), Number(limit),)

                const res = RespMap(result);

                return c.json(res?.body, res?.status);
            })
        })
        r.setDocsMethod(app => {
            app.get("/getArchiveMonth", async c => {
                const result = await this.as.getArchiveMonth(getDb(c.env))

                const res = RespMap(result)

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/getArticleById", async c => {
                const body = c.req.query()
                const articleId = body.id

                const resp = requestParamErrorValidator({ articleId });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const result = await this.as.getArticleById(getDb(c.env), c.env.NEXUS_FILE_BUCKET, articleId)

                const res = RespMap(result)

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/adjacent", async c => {
                const body = c.req.query()
                const articleId = body.id

                const resp = requestParamErrorValidator({ articleId });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const result = await this.as.adjacent(getDb(c.env), articleId)

                const res = RespMap(result)

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/recommended", async c => {
                const body = c.req.query()
                let limit = body.limit

                const resp = requestParamErrorValidator({ limit });

                if (resp) {
                    limit = "2"
                }

                const result = await this.as.recommended(getDb(c.env), Number(limit),)

                const res = RespMap(result);

                return c.json(res?.body, res?.status);
            })
        })

        r.setDocsMethod(app => {
            app.get("/like", async c => {
                const body = c.req.query()
                const articleId = body.articleId
                const increaseNumber = body.increase

                const resp = requestParamErrorValidator({ articleId, increaseNumber });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.as.like(getDb(c.env), articleId, (Number(increaseNumber) === 1 ? true : false))
                )

                return c.json(res?.body, res?.status)
            })
        })

        r.setDocsMethod(app => {
            app.get("/view", async c => {
                const body = c.req.query()
                const articleId = body.articleId

                const resp = requestParamErrorValidator({ articleId, });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.as.view(getDb(c.env), articleId,)
                )

                return c.json(res?.body, res?.status)
            })
        })
    }

}