import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { Route, VarsAndBindingsEnv } from "../route";

export type AssetsRouteSetEnv = object;

export type AssetsRouteGetEnv = object;

export type AssetsRouteBindingsEnv = {
  NEXUS_FILE_BUCKET: R2Bucket;
};

export class AssetsRoute extends Route<
  VarsAndBindingsEnv<
    AssetsRouteSetEnv,
    AssetsRouteGetEnv,
    AssetsRouteBindingsEnv
  >,
  AssetsRouteSetEnv,
  AssetsRouteGetEnv
> {
  setRoutePrefix(): string | null {
    return "/assets";
  }
  midd(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app: Hono<
      VarsAndBindingsEnv<
        AssetsRouteSetEnv,
        AssetsRouteGetEnv,
        AssetsRouteBindingsEnv
      >,
      BlankSchema,
      "/"
    >,
  ): Result<null> {
    return Ok(null);
  }
  setupMehods(r: this): void {
    r.setMethod((app) => {
      app.get("/file/:name{.+}", async (c) => {
        const name = c.req.param("name");

        const fileObj = await c.env.NEXUS_FILE_BUCKET.get(name);
        if (!fileObj) {
          return c.json({ message: "文件不存在" }, 404);
        }

        const headers = new Headers();
        fileObj.writeHttpMetadata(headers);
        headers.set("etag", fileObj.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        // R2 没写入 content-type 时做兜底推断
        if (!headers.get("content-type")) {
          const ext = name.split(".").pop()?.toLowerCase();
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
      });
    });
  }
}
