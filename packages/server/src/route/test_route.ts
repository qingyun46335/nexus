import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { VarsEnv } from "./route";
import { RouteDocs } from "./route_docs";

type TestRouteSetEnv = object;

type TestRouteGetEnv = {
  requestId: string;
};

export class TestRoute extends RouteDocs<
  VarsEnv<TestRouteSetEnv, TestRouteGetEnv>,
  TestRouteSetEnv,
  TestRouteGetEnv
> {
  setupMehods(r: this): void {
    r.setDocsMethod((app) => {
      app.get("/test", (c) => {
        return c.text("/test/test  请求完成", 200);
      });
      return Ok(null);
    }).setDocs((ad) => {
      ad.description = "请求测试";
      ad.params = {};
      ad.body = {};
      return ad;
    });
  }
  setRoutePrefix(): string | null {
    return "/test";
  }
  midd(
    app: Hono<VarsEnv<object, TestRouteGetEnv>, BlankSchema, "/">,
  ): Result<null> {
    app.use("*", async (c, next) => {
      await next();
    });
    return Ok(null);
  }
}
