import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { MethodBuilder, VarsAndBindingsEnv } from "./route";
import { jwt, sign } from "hono/jwt";
import { RouteDocs } from "./route_docs";
// import { basicAuth } from "hono/basic-auth";

export type AdminRouteSetEnv = object;

export type AdminRouteGetEnv = {
  requestId: string;
  abc: string;
  acd: number;
};

export type AdminRouteBindingsEnv = {
  ADMIN_USER: string;
  ADMIN_PASS: string;
  JWT_SECRET: string;
};

export class AdminRoute extends RouteDocs<
  VarsAndBindingsEnv<AdminRouteSetEnv, AdminRouteGetEnv, AdminRouteBindingsEnv>,
  AdminRouteSetEnv,
  AdminRouteGetEnv
> {
  setupMehods(
    r: MethodBuilder<
      VarsAndBindingsEnv<object, AdminRouteGetEnv, AdminRouteBindingsEnv>,
      object,
      AdminRouteGetEnv
    >,
  ): void {
    r.setMethod((app) => {
      app.post("/login", async (c) => {
        const body = await c.req.parseBody();
        const username = body.username;
        const password = body.password;
        if (password === (c.env.ADMIN_PASS as string)) {
          const payload = {
            sub: username,
            role: "user",
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          };
          const token = await sign(payload, c.env.JWT_SECRET, "HS256");

          return c.json({ token });
        }
        return c.text("账户或密码错误", 401);
      });
      return Ok(null);
    }).setDocs((ad) => {
      ad.description = "管理员登录";
      ad.params = {};
      ad.body = {
        username: "string",
        password: "string",
      };
      return ad;
    });
  }
  setRoutePrefix(): string | null {
    return "/admin";
  }

  midd(
    app: Hono<
      VarsAndBindingsEnv<
        AdminRouteSetEnv,
        AdminRouteGetEnv,
        AdminRouteBindingsEnv
      >,
      BlankSchema,
      "/"
    >,
  ): Result<null> {
    app.use("*", async (c, next) => {
      if (`${this.getFullPath()}/login` === c.req.path) {
        await next();
      } else {
        // 从环境变量或安全的地方获取密钥
        const jwtMiddleware = jwt({
          secret: c.env.JWT_SECRET,
          alg: "HS256",
        });
        return jwtMiddleware(c, next);
      }
    });
    return Ok(null);
  }
}
