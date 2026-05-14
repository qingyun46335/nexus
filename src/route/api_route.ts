import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../utils/result";
import { Route, VarsEnv } from "./route";


type ApiRouteSetEnv = object

type ApiRouteGetEnv = {
    requestId: string
    abc: string
}

export class ApiRoute extends Route<VarsEnv<ApiRouteSetEnv, ApiRouteGetEnv>, ApiRouteSetEnv, ApiRouteGetEnv> {
    setRoutePrefix(): string | null {
        return "/api"
    }
    midd(app: Hono<VarsEnv<ApiRouteSetEnv, ApiRouteGetEnv>, BlankSchema, "/">): Result<null> {
        app.use("*", async (c, next) => {
            console.log("ApiRoute log: ", c.get("requestId"))
            await next()
        })
        return Ok(null)
    }
    method(app: Hono<VarsEnv<ApiRouteSetEnv, ApiRouteGetEnv>, BlankSchema, "/">): Result<null> {
        app.get("/testAxios", (c) => {
            return c.text("testAxios  成功请求", 200)
        })
        return Ok(null)
    }

}