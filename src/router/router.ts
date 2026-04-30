import { Context, Hono } from 'hono'
import { BlankEnv, BlankInput, BlankSchema, Next } from 'hono/types'
import { Err, Ok, Result } from '../utils/result'
import { CustomError, ErrConTentRepeatResult, ErrCustomResult, ErrValidationResult, ValidationError } from '../error/error'
import { createMiddleware } from 'hono/factory'

/**
 * 请求处理函数类型
 * @param c - Hono框架的Context对象，包含请求和响应信息
 * @returns 返回Response或Promise<Response>
 */
type HandlerFn = (c: Context<BlankEnv, "/", BlankInput>) => Response | Promise<Response>

/**
 * 路由创建函数类型
 * @returns 返回包含Hono实例的Result对象
 */
type RouterFn = () => Result<Hono<BlankEnv, BlankSchema, "/">>

/**
 * 中间件函数类型
 * @param c - Hono框架的Context对象
 * @param next - 下一个中间件的执行函数
 * @returns Promise<void>
 */
type MiddlewareFn = (c: Context<BlankEnv, "*", {}>, next: Next) => Promise<void>

/**
 * 中间件生命周期阶段枚举
 * 按照执行顺序排列：Init → Auth → Business → Response
 */
enum MiddlewarePhase {
    Init = "init",        // 初始化阶段 - 用于全局初始化操作
    Auth = "auth",        // 认证阶段 - 用于身份验证
    Business = "business", // 业务阶段 - 用于业务逻辑处理
    Response = "response", // 响应阶段 - 用于响应处理和返回
}

/**
 * 中间件配置类型
 * 用于定义中间件的基本配置信息（输入配置）
 */
type MiddlewareConfig = {
    name: string          // 中间件名称
    fn: HandlerFn         // 中间件处理函数
    phase: MiddlewarePhase // 所属生命周期阶段
    order: number         // 同阶段内的执行顺序
    before: string[]      // 依赖于哪些中间件之前执行
    after: string[]       // 依赖于哪些中间件之后执行
}

/**
 * 中间件节点类型
 * 用于中间件排布处理后的节点（处理后的输出）
 * 注：当前结构与MiddlewareConfig相同，未来会根据需求进行细分
 */
type MiddlewareNode = {
    name: string          // 中间件名称
    fn: HandlerFn         // 中间件处理函数
    phase: MiddlewarePhase // 所属生命周期阶段
    order: number         // 同阶段内的执行顺序
    before: string[]      // 依赖于哪些中间件之前执行
    after: string[]       // 依赖于哪些中间件之后执行
}

/**
 * 根据生命周期阶段筛选中间件
 * @param middlewareConfigs - 中间件配置数组
 * @param cycle - 生命周期阶段名称
 * @returns 返回匹配该阶段的中间件配置数组
 */
function middlewareCycleFilter(middlewareConfigs: MiddlewareConfig[], cycle: string): MiddlewareConfig[] {
    return middlewareConfigs.filter(m => m.before.includes(cycle) || m.after.includes(cycle))
}

/**
 * 生命周期处理函数映射类型
 * key: MiddlewarePhase - 生命周期阶段
 * value: 该阶段专属的处理函数数组，每个函数接收中间件配置数组，返回处理后的节点数组
 */
type CycleTypeFn = Map<MiddlewarePhase, (((cycleMiddlewares: MiddlewareConfig[]) => Result<MiddlewareNode[]>) | null)[]>

/**
 * 中间件排布函数
 * 根据生命周期阶段和依赖关系（before/after）对中间件进行排序和分组
 * @param middlewareConfigs - 中间件配置数组
 * @param cycleFns - 各生命周期阶段的专属处理函数映射
 * @returns 返回按阶段分组的中间件节点Map，或错误信息
 */
function middlewareArrange(middlewareConfigs: MiddlewareConfig[], cycleFns: CycleTypeFn): Result<Map<string, MiddlewareNode[]> | null> {
    const cycleMap = new Map<string, MiddlewareConfig[]>()
    
    // 遍历所有生命周期阶段
    for (const cycle of Object.values(MiddlewarePhase)) {
        // 筛选属于当前阶段的中间件
        const cycleMiddlewares = middlewareCycleFilter(middlewareConfigs, cycle)
        
        // 预留：通用排布逻辑（待实现）
        for (const m of cycleMiddlewares) {
            
        }
        
        // 应用该阶段专属的处理函数
        for (const fn of cycleFns.get(cycle) ?? []) {
            if (fn) {
                const { v: nodes, e } = fn(cycleMiddlewares)
                if (e) return Err(e, null)
                cycleMap.set(cycle, nodes)
            }
        }
    }

    return Ok(cycleMap)
}

/**
 * 路由管理器类
 * 作为整个路由系统的入口，管理根路由
 */
export class Router {
    private baseRouter: BaseRouter // 根路由实例

    /**
     * 构造函数
     * @param fnHono - 创建Hono实例的函数
     */
    constructor(fnHono: RouterFn) {
        this.baseRouter = new BaseRouter("/", fnHono)
    }

    /**
     * 启动路由系统
     * @returns 返回Result，成功返回null，失败返回错误信息
     */
    start(): Result<null> {
        const { v: baseHono, e: baseE } = this.baseRouter.start()
        if (baseE) return Err(baseE, null)

        return Ok(null)
    }

}

/**
 * 基础路由类
 * 负责管理单个路由节点，可以包含子路由组和具体的路由处理器
 */
export class BaseRouter {
    basePath: string // 当前路由的基础路径
    private getHono: RouterFn // 创建Hono实例的函数
    private fnMap: Map<string, { methodType: string, fn: HandlerFn }> // 存储路由处理器的映射
    private methodPathMap: Map<string, BaseRouter> // 存储子路由组的映射

    /**
     * 构造函数
     * @param basePath - 当前路由的基础路径
     * @param fn - 创建Hono实例的函数
     */
    constructor(basePath: string, fn: RouterFn) {
        this.basePath = basePath
        this.getHono = fn
        this.fnMap = new Map<string, { methodType: string, fn: HandlerFn }>()
        this.methodPathMap = new Map<string, BaseRouter>()
    }

    /**
     * 创建子路由组
     * @param groupName - 子路由组名称（同时作为基础路径）
     * @returns 返回新创建或已存在的子路由组实例
     */
    group(groupName: string): Result<BaseRouter | null> {
        if (!groupName) {
            return ErrValidationResult(null)
        }
        // 如果已存在同名路由组，直接返回
        if (this.methodPathMap.has(groupName)) {
            const api = this.methodPathMap.get(groupName)
            if (api) return Ok(api)
        }

        // 创建新的子路由组
        const api = new BaseRouter(groupName, () => Ok(new Hono()))
        this.methodPathMap.set(groupName, api)
        return Ok(api)
    }

    /**
     * 注册GET请求处理器
     * @param path - 请求路径
     * @param fn - 请求处理函数
     * @returns 返回Result，成功返回null
     */
    get(path: string, fn: HandlerFn): Result<null> {
        if (!path) {
            return ErrValidationResult(null)
        }

        // 检查路径是否已被注册
        if (this.fnMap.has(path)) {
            return ErrConTentRepeatResult(null)
        }
        this.fnMap.set(path, { methodType: "get", fn: fn })

        return Ok(null)
    }

    /**
     * 注册POST请求处理器（暂未实现）
     * @param path - 请求路径
     * @param fn - 请求处理函数
     * @returns 返回错误信息，表示暂不支持
     */
    post(path: string, fn: HandlerFn): Result<null> {
        return ErrCustomResult("暂不支持post方法", null)
    }

    /**
     * 启动当前路由节点，递归注册所有子路由和处理器
     * @returns 返回配置完成的Hono实例，或错误信息
     */
    start(): Result<Hono> {
        // 检查是否有任何路由配置
        if (this.fnMap.size == 0 && this.methodPathMap.size == 0) {
            return ErrCustomResult("下级路由为空", new Hono())
        }

        // 获取Hono实例
        const { v: hono, e } = this.getHono()
        if (e) {
            return Err(e, new Hono())
        }

        // 注册所有子路由组
        if (this.methodPathMap.size != 0) {
            for (const [k, v] of this.methodPathMap.entries()) {
                const { v: h, e } = v.start()
                if (e) {
                    return Err(e, new Hono())
                }
                try {
                    hono.route(k, h)
                } catch (e) {
                    return ErrCustomResult(`route 注册错误：${k}`, new Hono())
                }
            }
        }

        // 注册所有路由处理器
        if (this.fnMap.size != 0) {
            for (const [k, v] of this.fnMap.entries()) {
                const { v: _, e } = this.methodTypeRegister(hono, k, v)
                if (e) {
                    return Err(e, new Hono())
                }
            }
        }

        return Ok(hono)
    }

    /**
     * 根据HTTP方法类型注册路由处理器
     * @param hono - Hono实例
     * @param path - 请求路径
     * @param typeFn - 包含方法类型和处理函数的对象
     * @returns 返回Result，成功返回null
     */
    methodTypeRegister(hono: Hono, path: string, typeFn: { methodType: string, fn: HandlerFn }): Result<null> {
        const { methodType: type, fn } = typeFn
        try {
            switch (type) {
                case "get":
                    hono.get(path, fn)
                    return Ok(null)
                default:
                    return ErrCustomResult(`route 注册失败：${path}`, null)
            }
        } catch (e) {
            return ErrCustomResult(`route 注册失败：${path}`, null)
        }
    }

}