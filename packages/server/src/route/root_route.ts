import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsEnv } from "./route";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

export type RootRouteSetEnv = {
  requestId: string;
  abc: string;
};

export type RootRouteGetEnv = object;

export class RootRoute extends Route<
  VarsEnv<RootRouteSetEnv, RootRouteGetEnv>,
  RootRouteSetEnv,
  RootRouteGetEnv
> {
  setupMehods(r: this): void {
    r.setMethod((app) => {
      app.get("/", (c) => {
        // console.log("index html")
        // return c.html(index)
        return c.newResponse(null);
      });
      return Ok(null);
    });
  }

  setRoutePrefix(): string | null {
    return "/";
  }

  midd(
    app: Hono<VarsEnv<RootRouteSetEnv, RootRouteGetEnv>, BlankSchema, "/">,
  ): Result<null> {
    app.use("*", requestId());
    app.use("*", secureHeaders());
    app.use("*", logger());
    return Ok(null);
  }

  onError() {
    this.hono.onError((err, c) => {
      if (err instanceof HTTPException) {
        return err.getResponse();
      }
      console.error(err);
      return c.json({ error: "Internal Server Error" }, 500);
    });
  }

  notFound() {
    this.hono.notFound((c) => {
      return c.redirect("/pages/error?code='404'");
    });
  }
}
