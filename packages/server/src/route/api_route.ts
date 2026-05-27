import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { VarsAndBindingsEnv } from "./route";
import { verify } from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";
import { RouteDocs } from "./route_docs";
import { ApiDocDef } from "../utils/api_doc_collector";

type ApiRouteSetEnv = {
  acd: number;
};

type ApiRouteGetEnv = {
  requestId: string;
  abc: string;
};

type ApiRouteBindingsEnv = {
  JWT_SECRET: string;
};

export class ApiRoute extends RouteDocs<
  VarsAndBindingsEnv<ApiRouteSetEnv, ApiRouteGetEnv, ApiRouteBindingsEnv>,
  ApiRouteSetEnv,
  ApiRouteGetEnv
> {
  setRoutePrefix(): string | null {
    return "/api";
  }
  midd(
    app: Hono<
      VarsAndBindingsEnv<ApiRouteSetEnv, ApiRouteGetEnv, ApiRouteBindingsEnv>,
      BlankSchema,
      "/"
    >,
  ): Result<null> {
    app.use("*", async (c, next) => {
      console.log("ApiRoute log: ", c.get("requestId"));
      await next();
    });
    return Ok(null);
  }

  setupMehods(r: this): void {
    r.setDocsMethod((app) => {
      app.get("/verify", async (c) => {
        const authHeader = c.req.header("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return c.text("Missing token", 401);
        }

        const token = authHeader.slice(7); // 去掉 "Bearer "

        try {
          const payload: JWTPayload = await verify(
            token,
            c.env.JWT_SECRET,
            "HS256",
          );
          c.set("jwtPayload", payload);
        } catch {
          return c.text("Invalid token", 401);
        }

        return c.text("成功", 200);
      });
      return Ok(null);
    }).setDocs((ad: ApiDocDef) => {
      ad.description = "token 手动校验接口";
      ad.params = { authorization: "string" };
      ad.body = {};
      return ad;
    });
  }
  //   method(
  //     app: Hono<
  //       VarsAndBindingsEnv<ApiRouteSetEnv, ApiRouteGetEnv, ApiRouteBindingsEnv>,
  //       BlankSchema,
  //       "/"
  //     >,
  //   ): Result<null> {
  //     app.get("/verify", async (c) => {
  //       const authHeader = c.req.header("authorization");

  //       if (!authHeader || !authHeader.startsWith("Bearer ")) {
  //         return c.text("Missing token", 401);
  //       }

  //       const token = authHeader.slice(7); // 去掉 "Bearer "

  //       try {
  //         const payload: JWTPayload = await verify(
  //           token,
  //           c.env.JWT_SECRET,
  //           "HS256",
  //         );
  //         c.set("jwtPayload", payload);
  //       } catch {
  //         return c.text("Invalid token", 401);
  //       }

  //       return c.text("成功", 200);
  //     });
  //     return Ok(null);
  //   }
}
