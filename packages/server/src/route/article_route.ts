import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { VarsAndBindingsEnv } from "./route";
import { RouteDocs } from "./route_docs";
import { ArticleService } from "../service/article_service";
import { requestParamErrorValidator, RespMap } from "../utils/response_mapping";
import { MarkdownUtil } from "../utils/markdown_util";

const fileMaxLength = 30;

export type FileMeta = {
  id: string;
  name: string;
  size: string;
  suffix: string;
  relativePath: string;
};

type AdminArticleRouteSetEnv = object;

type AdminArticleRouteGetEnv = object;

type AdminArticleRouteBindingsEnv = {
  UPLOAD_KV: KVNamespace;
  NEXUS_FILE_BUCKET: R2Bucket;
};

export class AdminArticleRoute extends RouteDocs<
  VarsAndBindingsEnv<
    AdminArticleRouteSetEnv,
    AdminArticleRouteGetEnv,
    AdminArticleRouteBindingsEnv
  >,
  AdminArticleRouteSetEnv,
  AdminArticleRouteGetEnv
> {
  //   constructor(apiDocCollector: ApiDocCollector, prefix?: string) {
  //     super(apiDocCollector, prefix);
  //   }

  private ar: ArticleService = new ArticleService(new MarkdownUtil());

  setRoutePrefix(): string | null {
    return "/article";
  }
  midd(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app: Hono<
      VarsAndBindingsEnv<
        AdminArticleRouteSetEnv,
        AdminArticleRouteGetEnv,
        AdminArticleRouteBindingsEnv
      >,
      BlankSchema,
      "/"
    >,
  ): Result<null> {
    return Ok(null);
  }
  setupMehods(r: this): void {
    r.setDocsMethod((app) => {
      app.post("/prepare", async (c) => {
        const body = await c.req.parseBody();
        const { filesNum } = body;

        const resp = requestParamErrorValidator({ filesNum });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        if (Number(filesNum) > fileMaxLength) {
          return c.text("文件数量太多", 500);
        }

        const res = RespMap(
          await this.ar.prepare(c.env.UPLOAD_KV, Number(filesNum)),
        );

        return c.json(res?.body, res?.status);
      });
    });
    r.setDocsMethod((app) => {
      app.post("/upload", async (c) => {
        const body = await c.req.parseBody();
        const uploadId = body[`uploadId`] as string;
        const fileMeta = body[`meta`];
        const file = body[`file`] as unknown as File;

        const resp = requestParamErrorValidator({ uploadId, fileMeta, file });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const fms = JSON.parse(fileMeta as string) as FileMeta;

        if (!(file instanceof File)) {
          return c.text("No file", 400);
        }

        const res = RespMap(
          await this.ar.upload(
            c.env.UPLOAD_KV,
            c.env.NEXUS_FILE_BUCKET,
            uploadId,
            fms,
            file,
          ),
        );

        return c.json(res?.body, res?.status);
      });
    });
    r.setDocsMethod((app) => {
      app.post("/upload_after", async (c) => {
        const body = await c.req.parseBody();
        const uploadId = body[`uploadId`] as string;

        const resp = requestParamErrorValidator({ uploadId });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const res = RespMap(
          await this.ar.uploadAfter(
            c.env.UPLOAD_KV,
            c.env.NEXUS_FILE_BUCKET,
            uploadId,
          ),
        );

        return c.json(res?.body, res?.status);
      });
    });
  }
}
