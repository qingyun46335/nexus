import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsAndBindingsEnv } from "./route";

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
      app.get("/img/:name", async (c) => {
        const { name } = c.req.param();
        console.log("file_name: ", name);
        const imgObj = await c.env.NEXUS_FILE_BUCKET.get(name);
        if (!imgObj) {
          return c.json("图片不存在", 500);
        }
        const headers = new Headers();

        imgObj.writeHttpMetadata(headers);

        headers.set("etag", imgObj.httpEtag);

        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        return new Response(imgObj.body, {
          headers,
        });
      });
    });
  }
}
