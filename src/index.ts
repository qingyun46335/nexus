import Server from "./server/server";
import { Hono } from "hono";
import { RootRouteEnv } from "./route/root_route";
import { RootRoute } from "./route/root_route";
import { AdminRoute } from "./route/admin_route";
import { VarsEnv } from "./route/route";

function main(): Hono<VarsEnv<RootRouteEnv>> {

  const admin = new AdminRoute("/admin")
  const route = new RootRoute("/")
  route.notFound()
  route.onError()
  route.setRoute(admin)
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
