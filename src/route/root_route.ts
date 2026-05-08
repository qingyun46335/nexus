import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsEnv } from "./route";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

export type RootRouteEnv = Record<string, unknown>

export class RootRoute extends Route<VarsEnv<RootRouteEnv>> {
    midd(app: Hono<VarsEnv<RootRouteEnv>, BlankSchema, "/">): Result<null> {
        app.use("*", requestId())
        app.use("*", secureHeaders())
        app.use("*", logger())
        return Ok(null)
    }
    method(app: Hono<VarsEnv<RootRouteEnv>, BlankSchema, "/">): Result<null> {
        app.use()
        return Ok(null)
    }

    onError() {
        this.hono.onError((err, c) => {
            if (err instanceof HTTPException) {
                return err.getResponse()
            }
            console.error(err)
            return c.json({ error: "Internal Server Error" }, 500)
        })
    }

    notFound() {
        this.hono.notFound((c) => {
            return c.html(`
                <!DOCTYPE html>
                <html>
                <head><title>404 Not Found</title></head>
                <body style="text-align:center; padding:100px; font-family: sans-serif;">
                    <h1>404</h1>
                    <p>抱歉，您访问的页面已失踪。</p>
                </body>
                </html>`)
        })
    }

}