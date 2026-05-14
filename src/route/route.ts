import { Hono } from "hono";
import { Env } from "hono/types";
import { Err, Ok, OkMsg, Result } from "../utils/result";

/**
 * 继承Route 的路由，他的中间件中如果set了需要在路径之后的中间件中流转，那么之后的中间件需要明确在O中对get的属性明确声明，保证其类型安全
 */
export type VarsAndBindingsEnv<S, G, B> = {
    Variables: S & G
    Bindings: B
}

export type VarsEnv<S, G> = {
    Variables: S & G
}

export type BindingsEnv<B> = {
    Bindings: B
}

// 类型工具：判断对象是否为空对象（没有必填属性）
type IsEmpty<T> = keyof T extends never ? true : false;

// 核心检查：G 非空时，要求 G 必须被 S 完全覆盖（key 和 value 都要兼容）
type CheckGetCovered<G, S> =
    IsEmpty<G> extends true
    ? unknown
    : S extends G   // 改成 S extends G：S 必须是 G 的子类型（即 S 覆盖了 G 的所有字段）
    ? unknown
    : `Missing or incompatible variables: ${Extract<keyof G, string>}`;

export type GroupRouteFn<E extends Env> = (app: Hono<E>) => Result<null> | Result<string>

export abstract class Route<E extends Env, S, G> {

    private _g: G

    private prefix: string
    protected hono: Hono<E>

    constructor(prefix?: string) {
        if (prefix) {
            this.initPrefixNotNull(prefix)
        } else {
            this.initPrefixIsNull()
        }
        this.hono = new Hono<E>
        console.log(`${this.prefix} 实例化完成`)
    }

    initPrefixIsNull() {
        const pf = this.setRoutePrefix()
        if (pf) {
            this.prefix = pf
        }
    }

    initPrefixNotNull(prefix: string) {
        this.prefix = prefix
    }

    abstract setRoutePrefix(): string | null

    private groupRouteFn: GroupRouteFn<E>[] = []

    /**
     * 挂载子路由
     * - 检查子路由的 G0 是否被当前路由的 S 覆盖
     * - 返回子路由实例，但其类型已被增强：Set 合并为 S & S0，Get 保留子路由的 G0
     * 
     * 注：Set、Get不声明，c.set、c.get  报错，这是hono  原本的基本功能，
     * 现在，我在此基础上，将类型计算与setRoute  强制耦合，虽然类型安全、类型计算依旧不能运行时，
     * 但利用这种假装已注册（实际延迟注册到运行时），也算完成我的大部分设想，
     * 但使用时依旧要注意写法：
     *  推荐：route.setRoute(new ApiRoute())
     *  而不推荐是：
     *  先const api = new ApiRoute()
     *  再const apiEnhanced = route.setRoute(api)
     * 避免造成混用，导致声明了相关的属性，setRoute时却还是报错了
     */
    setRoute<
        E0 extends Env,
        S0,
        G0
    >(
        r: Route<E0, S0, G0> &
            (
                CheckGetCovered<G0, S> extends string
                ? { __error: CheckGetCovered<G0, S> }
                : object
            ),
    ): Route<E0, S & S0, G0> {
        this.groupRouteFn.push((app) => {
            const { v: val, e } = r.build();
            if (e) return Err(e);
            app.route(r.prefix, val);
            return Ok(r.prefix);
        });
        // 类型断言：r 实际还是那个对象，但对外类型升级为 Set 合并版
        return r as unknown as Route<E0, S & S0, G0>;
    }

    abstract midd(app: Hono<E>): Result<null>
    group(app: Hono<E>): Result<null> {
        for (const fn of this.groupRouteFn) {
            const { v: v, e: e } = fn(app)
            if (e) {
                return Err(e)
            }
            if (v) {
                console.log(`${v} 挂载完成`)
            }
            console.log("fn: ", fn)
        }
        return Ok(null)
    }
    abstract method(app: Hono<E>): Result<null>

    build(): Result<Hono<E>> {
        let res = this.midd(this.hono)
        if (res.e) {
            return Err(res.e)
        }
        res = this.group(this.hono)
        if (res.e) {
            return Err(res.e)
        }
        res = this.method(this.hono)
        if (res.e) {
            return Err(res.e)
        }
        return OkMsg(`${this.prefix} 路由创建成功`, this.hono)
    }
}