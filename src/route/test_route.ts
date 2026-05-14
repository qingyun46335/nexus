import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsEnv } from "./route";

type TestRouteSetEnv = object

type TestRouteGetEnv = {
    requestId: string
}

export class TestRoute extends Route<VarsEnv<TestRouteSetEnv, TestRouteGetEnv>, TestRouteSetEnv, TestRouteGetEnv> {
    setRoutePrefix(): string | null {
        return "/test"
    }
    midd(app: Hono<VarsEnv<object, TestRouteGetEnv>, BlankSchema, "/">): Result<null> {
        app.use("*", async (c, next) => {
            await next()
        })
        return Ok(null)
    }
    method(app: Hono<VarsEnv<object, TestRouteGetEnv>, BlankSchema, "/">): Result<null> {
        app.get("/test", (c) => {
            return c.text("/test/test  请求完成")
        })
        return Ok(null)
    }

}