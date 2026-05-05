import Server from "./server/server";
import { Hono } from "hono";
import { RouteEnv } from "./router/route";

function main(): Hono<RouteEnv> {
  const server = new Server();

  server.server();
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
