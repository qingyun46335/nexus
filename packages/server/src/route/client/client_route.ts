import { Hono } from "hono"
import { BlankSchema } from "hono/types"
import { Ok, Result } from "../../utils/result"
import { VarsAndBindingsEnv } from "../route"
import { RouteDocs } from "../route_docs"


export type ClientSetEnv = object

export type ClientGetEnv = object

export type ClientBindingsEnv = object & {

}

export class ClientRoute extends RouteDocs<VarsAndBindingsEnv<ClientSetEnv, ClientGetEnv, ClientBindingsEnv>, ClientSetEnv, ClientGetEnv> {
    setRoutePrefix(): string | null {
        return "/client"
    }
    midd(app: Hono<VarsAndBindingsEnv<ClientSetEnv, ClientGetEnv, ClientBindingsEnv>, BlankSchema, "/">): Result<null> {
        return Ok(null)
    }
    setupMehods(r: this): void {

    }

}