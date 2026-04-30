import { createMiddleware } from "hono/factory"
import Server from "./server/server"
import { Context, Hono, MiddlewareHandler, Next } from "hono"
import { BlankEnv } from "hono/types"

function main(): Server {
  const server = new Server()

  const { router } = server.server()

  const { v: admin, e } = router.group("/admin")
  if (e != null) {
    console.log("路由分组失败")
    return server
  }

  const { v: _, e: err } = admin!.get("/test", (c) => {
    return c.text("hello world")
  })

  const { v: view, e: err1 } = admin!.group("/view")

  view?.get("/te", (c) => {
    return c.text("te")
  })

  server.init()
  server.start()

  return server
}

const { v: hono, e } = main().getHono()

if (!e === null) {
  console.log("hono獲取失敗")
}

hono.use(async (c: Context<BlankEnv, "*", {}>, next: Next) => {
  console.log("Middleware 1")
  await next()
})

export default hono

