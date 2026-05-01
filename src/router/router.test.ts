import { describe, it, expect } from "vitest";
import { Context, Hono } from "hono";
import { MiddlewarePhase, Router } from "../router/router";
import { Ok } from "../utils/result";
import { BlankEnv, BlankInput, Next } from "hono/types";

describe("Router", () => {
  it("get /test_get 路由", async () => {
    const hono = new Hono();
    const router = new Router(() => Ok(hono));
    const bR = router.getBaseRouter();
    bR.get("/test_get", (c) => {
      return c.text("hello world");
    })

    // 需要先启动路由才能正常请求
    bR.startRouter();
    const res = await hono.request("/test_get");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello world");
  })

  it("group /test_group 路由分组", async () => {
    const hono = new Hono();
    const router = new Router(() => Ok(hono));
    const bR = router.getBaseRouter();
    const { v: group, e } = bR.group("/test_group");
    expect(e).toBeNull(); // 成功时 e 是 null
    group?.get("/test_get", (c) => {
      return c.text("hello world");
    });

    // 需要先启动路由才能正常请求
    bR.startRouter();

    const res = await hono.request("/test_group/test_get");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello world");
  });
});

describe("Router Middleware (midd)", () => {
  // 辅助函数：快速创建符合规范的中间件配置
  const createMidd = (
    name: string,
    order: number,
    before: string[] = [],
    after: string[] = [],
    action: () => void // 用于在执行时触发回调，方便记录执行顺序
  ) => ({
    t: 1,
    name,
    phase: MiddlewarePhase.Default,
    order,
    before,
    after,
    fn: async (c: Context<BlankEnv, "*", BlankInput>, next: Next) => {
      action();
      await next();
    },
  });

  it("1. 基础中间件：应成功挂载并执行", async () => {
    const hono = new Hono();
    const router = new Router(() => Ok(hono));
    const bR = router.getBaseRouter();

    bR.midd({
      t: 1,
      name: "header-midd",
      phase: MiddlewarePhase.Default,
      order: 1,
      before: [],
      after: [],
      fn: async (c, next) => {
        c.header("X-Custom-Midd", "worked"); // 注入一个 Header 证明执行过
        await next();
      },
    });

    bR.get("/test_midd", (c) => c.text("hello"));
    bR.startRouter();

    const res = await hono.request("/test_midd");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Custom-Midd")).toBe("worked");
  });

  it("2. Order 排序：同层级无依赖时，应按 order 从小到大执行", async () => {
    const hono = new Hono();
    const router = new Router(() => Ok(hono));
    const bR = router.getBaseRouter();
    const executionOrder: string[] = [];

    // 乱序注册，但 order 明确
    bR.midd(createMidd("M3", 3, [], [], () => executionOrder.push("M3")));
    bR.midd(createMidd("M1", 1, [], [], () => executionOrder.push("M1")));
    bR.midd(createMidd("M2", 2, [], [], () => executionOrder.push("M2")));

    bR.get("/test", (c) => c.text("ok"));
    bR.startRouter();
    await hono.request("/test");

    // 期望执行顺序：M1 (order:1) -> M2 (order:2) -> M3 (order:3)
    expect(executionOrder).toEqual(["M1", "M2", "M3"]);
  });

  it("3. DAG 拓扑排序：基于 before/after 自动推断正确的执行顺序", async () => {
    const hono = new Hono();
    const router = new Router(() => Ok(hono));
    const bR = router.getBaseRouter();
    const executionOrder: string[] = [];

    // 场景：我们需要 A -> B -> C 的执行顺序
    // A 必须在 B 之前 (A.before = [B])
    // C 必须在 B 之后 (C.after = [B])
    // 我们故意打乱注册顺序
    bR.midd(createMidd("C", 1, ["B"], [], () => executionOrder.push("C")));
    bR.midd(createMidd("B", 1, [], [], () => executionOrder.push("B")));
    bR.midd(createMidd("A", 1, [], ["B"], () => executionOrder.push("A")));

    bR.get("/test", (c) => c.text("ok"));
    const { e } = bR.startRouter();
    await hono.request("/test");
    expect(e).toBeNull();
    console.log("执行顺序:", executionOrder);

    // 拓扑排序应纠正为：A -> B -> C
    expect(executionOrder).toEqual(["A", "B", "C"]);
  });

  it("4. 异常拦截：重复添加相同名称的中间件应报错", () => {
    const router = new Router(() => Ok(new Hono()));
    const bR = router.getBaseRouter();

    const m1 = createMidd("Duplicate", 1, [], [], () => { });
    const res1 = bR.midd(m1);
    expect(res1.e).toBeNull(); // 第一次成功

    const res2 = bR.midd(m1);
    expect(res2.e).not.toBeNull(); // 第二次拦截
    expect(res2.e?.message).toContain("重复添加");
  });

  it("5. 异常拦截：中间件自我依赖应报错", () => {
    const router = new Router(() => Ok(new Hono()));
    const bR = router.getBaseRouter();

    bR.midd(createMidd("SelfNode", 1, ["SelfNode"], [], () => { }));
    bR.get("/test", (c) => c.text("ok"));

    const { e } = bR.startRouter();
    expect(e).not.toBeNull();
    expect(e?.message).toContain("不能依赖于自己");
  });

  it("6. 异常拦截：循环依赖应被检测并报错", () => {
    const router = new Router(() => Ok(new Hono()));
    const bR = router.getBaseRouter();

    // A 依赖 B (A 要在 B 前面)，B 依赖 A (B 要在 A 前面) -> 死锁
    bR.midd(createMidd("A", 1, ["B"], [], () => { }));
    bR.midd(createMidd("B", 1, ["A"], [], () => { }));
    bR.get("/test", (c) => c.text("ok"));

    const { e } = bR.startRouter(); // startRouter 时会触发中间件排布和拓扑排序检查[cite: 1]

    expect(e).not.toBeNull();
    expect(e?.message).toContain("中间件依赖关系存在循环");
  });
});
