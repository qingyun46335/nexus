import { Context, Hono } from "hono"
import { BlankInput, BlankSchema } from "hono/types"
import { Ok, Result } from "../../utils/result"
import { VarsAndBindingsEnv } from "../route"
import { RouteDocs } from "../route_docs"
import { requestParamErrorValidator } from "../../utils/response_mapping"


export type AssetsSetEnv = object

export type AssetsGetEnv = object

export type AssetsBindingsEnv = object & {
    NEXUS_FILE_BUCKET: R2Bucket;
}

export class AssetsRoute extends RouteDocs<VarsAndBindingsEnv<AssetsSetEnv, AssetsGetEnv, AssetsBindingsEnv>, AssetsSetEnv, AssetsGetEnv> {
    setRoutePrefix(): string | null {
        return "/assets"
    }
    midd(app: Hono<VarsAndBindingsEnv<AssetsSetEnv, AssetsGetEnv, AssetsBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {
        r.setMethod((app) => {
            app.get("/text/:name{.+}", async (c) => {

                return await getFile(c,)

            });
        });

        r.setDocsMethod(app => {
            app.get("/image/:name{.+}", async c => {
                return await getFile(c,)
            })
        })

        r.setMethod((app) => {
            app.get("/audio/:name{.+}", async (c) => {

                return await getFile(c,)

            });
        });

        r.setMethod((app) => {
            app.get("/video/:name{.+}", async (c) => {

                return await getFile(c,)

            });
        });

        r.setMethod((app) => {
            app.get("/unsupported/:name{.+}", async (c) => {

                return await getFile(c,)

            });
        });
    }
}

async function getFile(c: Context<VarsAndBindingsEnv<AssetsSetEnv, AssetsGetEnv, AssetsBindingsEnv>, "", BlankInput>) {

    const name = c.req.param("name");

    const resp = requestParamErrorValidator({ name });

    if (resp) {
        return c.newResponse(JSON.stringify(resp.body), resp.status);
    }

    const suffix = (name as string).split('.').pop() || ""

    if (suffix === "md" || suffix === ".md") {
        return c.text("文件不存在", 400)
    }

    const fileObj = await c.env.NEXUS_FILE_BUCKET.get(name as string);
    if (!fileObj) {
        return c.json({ message: "文件不存在" }, 404);
    }

    const headers = new Headers();
    fileObj.writeHttpMetadata(headers);
    headers.set("etag", fileObj.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    // R2 没写入 content-type 时做兜底推断
    if (!headers.get("content-type")) {
        const ext = (name as string).split(".").pop()?.toLowerCase();
        const mime: Record<string, string> = {
            png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
            gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
            pdf: "application/pdf",
            mp4: "video/mp4", webm: "video/webm",
            mp3: "audio/mpeg", ogg: "audio/ogg",
            json: "application/json",
            txt: "text/plain", html: "text/html", css: "text/css",
            js: "application/javascript",
        };
        if (ext && mime[ext]) {
            headers.set("content-type", mime[ext]);
        }
    }

    return new Response(fileObj.body, { headers });
}