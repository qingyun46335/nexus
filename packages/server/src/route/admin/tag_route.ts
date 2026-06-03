import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { ErrFrom, Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping";
import { TagService } from "../../service/admin/tag_service";
import { getDb } from "../../utils/sqlite";
import { RequestParmError } from "../../error/error";

type AdminTagRouteSetEnv = object;

type AdminTagRouteGetEnv = object;

type AdminTagRouteBindingsEnv = {
    UPLOAD_KV: KVNamespace;
    NEXUS_FILE_BUCKET: R2Bucket;
    nexus_db: D1Database;
};

export class AdminTagRoute extends RouteDocs<VarsAndBindingsEnv<AdminTagRouteSetEnv, AdminTagRouteGetEnv, AdminTagRouteBindingsEnv>, AdminTagRouteSetEnv, AdminTagRouteGetEnv> {

    private ts: TagService = new TagService()

    setRoutePrefix(): string | null {
        return "/tag"
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    midd(app: Hono<VarsAndBindingsEnv<object, object, AdminTagRouteBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/selectTags", async c => {

                const body = await c.req.query()
                const status = body.status ? body.status : null

                if (status !== null && status !== "active" && status !== "inactive") {
                    const re = RespMap(ErrFrom(RequestParmError, "参数值错误"))
                    return c.json(re?.body, re?.status)
                }

                const res = RespMap(
                    await this.ts.selectTags(getDb(c.env), status)
                )

                return c.json(res?.body, res?.status)
            })
        }).setDocs(ad => {
            ad.description = "查询所有的标签"
            ad.params = {}
            return ad
        })

        r.setDocsMethod(app => {
            app.get("/getArticleToTagIds", async c => {
                const body = await c.req.query()
                const articleId = body.articleId

                const resp = requestParamErrorValidator({ articleId });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.ts.getArticleToTagIds(getDb(c.env), articleId as string)
                )

                return c.json(res?.body, res?.status)
            })
        }).setDocs(ad => {
            ad.description = "查询文章关联的标签id列表"
            ad.params = {
                articleId: "文章id"
            }
            return ad
        })

        r.setDocsMethod(app => {
            app.post("/addTag", async c => {
                const body = await c.req.parseBody()
                const tag = body.tag

                const resp = requestParamErrorValidator({ tag });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const res = RespMap(
                    await this.ts.addTag(getDb(c.env), tag as string)
                )

                return c.json(res?.body, res?.status)
            })
        }).setDocs(ad => {
            ad.description = "添加标签"
            ad.params = {
                tag: "标签名称"
            }
            return ad
        })

        r.setDocsMethod(app => {
            app.post("/updTagStatus", async c => {
                const body = await c.req.parseBody()
                const tagId = body.tagId
                const tagStatus = body.tagStatus

                const resp = requestParamErrorValidator({ tagId, tagStatus });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                if (tagStatus !== "active" && tagStatus !== "inactive") {
                    const re = RespMap(ErrFrom(RequestParmError, "参数值错误"))
                    return c.json(re?.body, re?.status)
                }

                const res = RespMap(
                    await this.ts.updTagStatus(getDb(c.env), tagStatus, tagId as string)
                )

                return c.json(res?.body, res?.status)
            })
        }).setDocs(ad => {
            ad.description = "更新标签状态"
            ad.params = {
                tagId: "标签id",
                tagStatus: "预备设置标签状态",
            }
            return ad
        })

        r.setDocsMethod(app => {
            app.post("/delTags", async c => {
                const body = await c.req.parseBody()
                const tagIdsString = body.tagIds

                const resp = requestParamErrorValidator({ tagIdsString });

                if (resp) {
                    return c.newResponse(JSON.stringify(resp.body), resp.status);
                }

                const tagIds = JSON.parse(tagIdsString as string) as string[]

                const res = RespMap(
                    await this.ts.delTag(getDb(c.env), tagIds)
                )

                return c.json(res?.body, res?.status)
            })
        }).setDocs(ad => {
            ad.description = "标签删除"
            ad.params = {
                tagId: "标签id"
            }
            return ad
        })
    }

}