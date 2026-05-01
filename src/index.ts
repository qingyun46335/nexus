import Server from "./server/server";
import { Context, Next } from "hono";
import { BlankEnv, Input } from "hono/types";
import { MiddlewarePhase } from "./router/router";

function main(): Server {
  const server = new Server();

  const { router } = server.server();

  const baseRouter = router.getBaseRouter();
  if (baseRouter == null) {
    console.log("基础路由获取失败");
    return server;
  }

  const { v: admin, e } = baseRouter.group("/admin");
  if (e != null) {
    console.log("路由分组失败");
    return server;
  }

  admin?.midd({
    t: 0,
    name: "adminMiddleware",
    fn: async (c, next) => {
      console.log("----> Admin Middleware In");
      await next();
      console.log("<---- Admin Middleware Out");
      // 删掉 return c.text(...)，不要拦截业务响应
    },
    phase: MiddlewarePhase.Default,
    order: 0,
    before: [],
    after: [],
  });

  admin?.midd({
    t: 1,
    name: "adminMiddleware2",
    fn: async (c, next) => {
      console.log("----> Admin Middleware 2 In");
      await next();
      console.log("<---- Admin Middleware 2 Out");
    },
    phase: MiddlewarePhase.Default,
    order: 1,
    before: ["adminMiddleware"],
    after: [],
  });

  admin!.get("/test", (c) => {
    return c.text("hello world");
  });

  const { v: view } = admin!.group("/view");

  view?.get("/te", (c) => {
    return c.text("te");
  });

  view?.midd({
    t: 0,
    name: "viewMiddleware",
    fn: async (c, next) => {
      console.log("----> View Middleware In");
      await next();
      console.log("<---- View Middleware Out");
    },
    phase: MiddlewarePhase.Default,
    order: 0,
    before: [],
    after: [],
  });

  server.init();
  server.start();

  return server;
}

const { v: hono, e } = main().getHono();

if (!e) {
  console.log("hono獲取失敗");
}

hono.use(async (c: Context<BlankEnv, "*", Input>, next: Next) => {
  console.log("Middleware 1");
  await next();
});

export default hono;
