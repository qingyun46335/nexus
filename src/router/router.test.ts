import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { Router } from "../router/router";
import { Ok } from "../utils/result";

describe("Router", () => {
  const hono = new Hono();
  const router = new Router(() => Ok(hono));
  const bR = router.getBaseRouter();
  it("group", async () => {
    const { v: group, e } = bR.group("/test");
    expect(e).toBeNull(); // 成功时 e 是 null
    group?.get("/test", (c) => {
      return c.text("hello world");
    });

    // 需要先启动路由才能正常请求
    bR.startRouter();

    const res = await hono.request("/test/test");
    expect(res.status).toBe(200);
    expect(res.text()).toBe("hello world");
  });
});
