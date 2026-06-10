import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { AdminArticleService } from "../../service/admin/article_service";
import { requestParamErrorValidator, RespMap } from "../../utils/response_mapping";
import { MarkdownUtil } from "../../utils/markdown_util";
import { getDb } from "../../utils/sqlite";
import { UpdArticleInfor } from "../../type/article";

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
  nexus_db: D1Database;
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

  private ar: AdminArticleService = new AdminArticleService(new MarkdownUtil());

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
      app.get("/selectArticle", async c => {
        const body = c.req.query();
        const page = body.page || "1";
        const pageSize = body.pageSize || "10";

        const keyword = body.keyword || "";
        let dateIntervalType: "createdAt" | "updatedAt";
        if (body.dateIntervalType === "createdAt") {
          dateIntervalType = "createdAt";
        } else if (body.dateIntervalType === "updatedAt") {
          dateIntervalType = "updatedAt";
        } else {
          dateIntervalType = "createdAt";
        }
        const dateFrom = body.dateFrom || "";
        const dateTo = body.dateTo || "";
        const selectedTags = body.tags ? body.tags.split(",") : [];

        const resp = requestParamErrorValidator({ page, pageSize, });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const result = await this.ar.getArticleList(
          getDb(c.env),
          Number(page),
          Number(pageSize),
          keyword,
          dateIntervalType,
          dateFrom,
          dateTo,
          selectedTags
        )

        const res = RespMap(result);

        return c.json(res?.body, res?.status);

      })
    }).setDocs(ad => {
      ad.description = "分页接口"
      ad.params = {
        page: "页数",
        pageSize: "单页条数",
        keyword: "模糊查询关键字",
        dateIntervalType: "创建或更新时间区间查询",
        dateFrom: "区间起始",
        dateTo: "区间结束",
        tags: "添加的标签",
      }
      return ad
    })

    r.setDocsMethod((app) => {
      app.get("/selectArticleFiles", async c => {
        const body = c.req.query();
        const articleId = body.articleId as string;

        const resp = requestParamErrorValidator({ articleId });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const result = await this.ar.getArticleFiles(getDb(c.env), articleId);

        const res = RespMap(result);

        return c.json(res?.body, res?.status);
      })
    }).setDocs(ad => {
      ad.description = "子表全量查询"
      ad.params = {
        articleId: "所属文章id"
      }
      return ad
    });

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
          await this.ar.prepare(c.env.UPLOAD_KV, getDb(c.env), Number(filesNum)),
        );

        return c.json(res?.body, res?.status);
      });
    }).setDocs(ad => {
      ad.description = "预上传接口"
      ad.params = {
        filesNum: "文件总数"
      }
      return ad
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
            getDb(c.env),
            c.env.NEXUS_FILE_BUCKET,
            uploadId,
            fms,
            file,
          ),
        );

        return c.json(res?.body, res?.status);
      });
    }).setDocs(ad => {
      ad.description = "文章拥有文件上传"
      ad.params = {
        uploadId: "上传id，与articleId是指一致",
        fileMeta: "文件信息",
        file: "文件本身"
      }
      return ad
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
            getDb(c.env),
            c.env.NEXUS_FILE_BUCKET,
            uploadId,
          ),
        );

        return c.json(res?.body, res?.status);
      });
    }).setDocs(ad => {
      ad.description = "上传后处理接口"
      ad.params = {
        uploadId: "上传id，与articleId是指一致"
      }
      return ad
    });

    r.setDocsMethod(app => {
      app.get("/getArticle", async c => {
        const body = c.req.query();
        const articleId = body.articleId

        const resp = requestParamErrorValidator({ articleId });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const res = RespMap(
          await this.ar.getArticle(getDb(c.env), articleId)
        )

        return c.json(res?.body, res?.status);
      })
    }).setDocs(ad => {
      ad.description = "根据id 搜索单条文章数据"
      ad.params = {
        articleId: "文章id"
      }
      return ad
    })

    r.setDocsMethod(app => {
      app.post("/updArticleInfor", async c => {
        const body = await c.req.parseBody();
        const articleString = body.article
        const articleId = body.articleId
        const newSwitchTagsString = body.newSwitchTags
        const delSwitchTagsString = body.delSwitchTags

        const resp = requestParamErrorValidator({ articleString, articleId, newSwitchTagsString, delSwitchTagsString });

        if (resp) {
          return c.newResponse(JSON.stringify(resp.body), resp.status);
        }

        const article = JSON.parse(articleString as string) as UpdArticleInfor

        const newSwitchTags = JSON.parse(newSwitchTagsString as string) as string[]
        const delSwitchTags = JSON.parse(delSwitchTagsString as string) as string[]

        const res = RespMap(
          await this.ar.updArticleInfor(getDb(c.env), article, articleId as string, newSwitchTags, delSwitchTags)
        )

        return c.json(res?.body, res?.status)
      })
    }).setDocs(ad => {
      ad.description = "更新文章信息"
      ad.params = {
        article: "文章信息更新数据",
        articleId: "文章id",
      }
      return ad
    })
  }
}
