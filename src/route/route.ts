import { Hono } from "hono";
import { Env } from "hono/types";
import { Err, Ok, OkMsg, Result } from "../utils/result";

/**
 * 继承Route 的路由，他的中间件中如果set了需要在路径之后的中间件中流转，那么之后的中间件需要明确在O中对get的属性明确声明，保证其类型安全
 */
export type VarsAndBindingsEnv<O, B> = {
    Variables: O
    Bindings: B
}

export type VarsEnv<O> = {
    Variables: O
}

export type BindingsEnv<B> = {
    Bindings: B
}

export type GroupRouteFn<E extends Env> = (app: Hono<E>) => Result<null>

export abstract class Route<E extends Env> {
    private prefix: string
    protected hono: Hono<E>

    constructor(prefix?: string) {
        if (prefix) {
            this.initPrefixNotNull(prefix)
        } else {
            this.initPrefixIsNull()
        }
        this.hono = new Hono<E>
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

    private groupRouteFn: GroupRouteFn<E> = () => Ok(null)

    setRoute<S extends Env>(...args: Route<S>[]): Result<null> {
        this.groupRouteFn = (app: Hono<E>): Result<null> => {
            for (const r of args) {
                const { v: val, e: e } = r.build()
                if (e) {
                    return Err(e)
                }
                app.route(r.prefix, val)
            }
            return Ok(null)
        }
        return Ok(null)
    }

    abstract midd(app: Hono<E>): Result<null>
    group(app: Hono<E>): Result<null> {
        const { e: e } = this.groupRouteFn(app)
        if (e) {
            return Err(e)
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