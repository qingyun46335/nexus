import Server from "./server/server";
import { Hono } from "hono";
import { RootRouteGetEnv, RootRouteSetEnv } from "./route/root_route";
import { RootRoute } from "./route/root_route";
import { AdminRoute } from "./route/admin_route";
import { VarsEnv } from "./route/route";
import { ApiRoute } from "./route/api_route";
import { TestRoute } from "./route/test_route";

function main(): Hono<VarsEnv<RootRouteSetEnv, RootRouteGetEnv>> {

  const route = new RootRoute()
  route.notFound()
  route.onError()
  const api = route.setRoute(new ApiRoute())
  api.setRoute(new TestRoute())
  api.setRoute(new AdminRoute())
  const server = new Server(route);

  server.init();
  const { v: hono, e } = server.start();
  if (e) {
    console.error("Failed to start server:", e);
  }
  if (!hono) {
    throw new Error("Failed to start server: hono instance is null");
  }

  return hono;
}

const hono = main();

export default hono;
