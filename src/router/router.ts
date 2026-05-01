import { Context, Hono } from "hono";
import { BlankEnv, BlankInput, BlankSchema, Next } from "hono/types";
import { Err, Ok, Result } from "../utils/result";
import {
  ErrConTentRepeatResult,
  ErrCustomResult,
  ErrValidationResult,
} from "../error/error";

/**
 * 请求处理函数类型
 * @param c - Hono框架的Context对象，包含请求和响应信息
 * @returns 返回Response或Promise<Response>
 */
type HandlerFn = (
  c: Context<BlankEnv, "/", BlankInput>,
  next: Next,
) => Response | Promise<Response>;

/**
 * 路由创建函数类型
 * @returns 返回包含Hono实例的Result对象
 */
type RouterFn = () => Result<Hono<BlankEnv, BlankSchema, "/">>;

/**
 * 中间件函数类型
 * @param c - Hono框架的Context对象
 * @param next - 下一个中间件的执行函数
 * @returns Promise<void> | Promise<Response>
 */
type MiddlewareFn = (
  c: Context<BlankEnv, "*", BlankInput>,
  next: Next,
) => Promise<void | Response>;

/**
 * 中间件生命周期阶段枚举
 * 当前仅定义 Default 阶段，未来可根据需求扩展为 Init → Auth → Business → Response 的完整生命周期
 */
export enum MiddlewarePhase {
  // Init = "init",        // 初始化阶段 - 用于全局初始化操作
  // Auth = "auth",        // 认证阶段 - 用于身份验证
  // Business = "business", // 业务阶段 - 用于业务逻辑处理
  // Response = "response", // 响应阶段 - 用于响应处理和返回
  Default = "default", // 默认阶段 - 用于不区分阶段的中间件
}

/**
 * 中间件配置类型
 * 用于定义中间件的基本配置信息（输入配置）
 */
export type MiddlewareConfig = {
  t: number; // 类型标记，用于避免超集类型导致的类型推断问题，实际使用时可替换为具体类型
  name: string; // 中间件名称（唯一标识）
  fn: MiddlewareFn; // 中间件处理函数
  phase: MiddlewarePhase; // 所属生命周期阶段
  order: number; // 同阶段内的执行顺序，数值越小越先执行
  before: string[]; // 依赖于哪些中间件之前执行
  after: string[]; // 依赖于哪些中间件之后执行
};

/**
 * 中间件描述符类型
 * 对中间件配置进行标准化处理后的类型，包含依赖关系的哈希值
 */
type MiddlewareDescriptor = {
  name: string; // 中间件名称
  fn: MiddlewareFn; // 中间件处理函数
  phase: MiddlewarePhase; // 所属生命周期阶段
  order: number; // 同阶段内的执行顺序
  before: string[]; // 依赖于哪些中间件之前执行
  after: string[]; // 依赖于哪些中间件之后执行
  beforeHash: number; // before所有依赖的无排序哈希值，用于快速判断依赖是否相同
  afterHash: number; // after所有依赖的无排序哈希值，用于快速判断依赖是否相同
};

/**
 * 标准化中间件描述符数组
 * 为每个描述符计算 beforeHash 和 afterHash
 * @param middlewareDescriptors - 中间件描述符数组
 * @returns 标准化后的中间件描述符数组
 */
// function normalizeMiddleware(
//   middlewareDescriptors: MiddlewareDescriptor[],
// ): MiddlewareDescriptor[] {
//   return middlewareDescriptors.map((md) => ({
//     ...md,
//     beforeHash: hashSet(md.before),
//     afterHash: hashSet(md.after),
//   }));
// }

/**
 * 标准化中间件配置数组
 * 将 MiddlewareConfig 转换为 MiddlewareDescriptor 并计算哈希值
 * @param middlewareConfigs - 中间件配置数组
 * @returns 标准化后的中间件描述符数组
 */
function normalizeMiddlewareConfig(
  middlewareConfigs: MiddlewareConfig[],
): MiddlewareDescriptor[] {
  return middlewareConfigs.map((md) => ({
    ...md,
    beforeHash: hashSet(md.before),
    afterHash: hashSet(md.after),
  }));
}

/**
 * 中间件节点类型
 * 用于中间件排布处理后的节点（处理后的输出）
 */
type MiddlewareNode = {
  name: string; // 中间件名称
  fn: MiddlewareFn; // 中间件处理函数
  phase: MiddlewarePhase; // 所属生命周期阶段
  order: number; // 同阶段内的执行顺序
  before: string[]; // 依赖于哪些中间件之前执行
  after: string[]; // 依赖于哪些中间件之后执行
};

/**
 * 根据生命周期阶段筛选中间件
 * @param middlewareConfigs - 中间件配置数组
 * @param cycle - 生命周期阶段名称
 * @returns 返回匹配该阶段的中间件配置数组
 */
function middlewareCycleFilter(
  middlewareConfigs: MiddlewareConfig[],
  cycle: string,
): MiddlewareConfig[] {
  return middlewareConfigs.filter((m) => m.phase.includes(cycle));
}

/**
 * 跨生命周期依赖检查
 * 验证所有中间件的依赖关系是否在同一个生命周期阶段内
 * @param middlewares - 中间件配置数组
 * @returns 验证通过返回 Ok(null)，失败返回错误信息
 */
function acrossCycleDependencyCheck(
  middlewares: MiddlewareConfig[],
): Result<null> {
  const phaseOrder = [MiddlewarePhase.Default]; // 定义生命周期阶段的执行顺序
  const phaseIndex = new Map<MiddlewarePhase, number>();
  phaseOrder.forEach((p, i) => phaseIndex.set(p, i));

  for (const m of middlewares) {
    const beforePhase = phaseIndex.get(m.phase);
    if (beforePhase === undefined) continue;

    // 检查 before 依赖是否在同一阶段
    for (const before of m.before) {
      const m1 = middlewares.find((m) => m.name === before);
      if (!m1) continue;
      const beforePhase = phaseIndex.get(m1.phase);
      if (beforePhase === undefined) continue;

      if (beforePhase != beforePhase) {
        return ErrCustomResult(
          `中间件 ${m.name} 依赖于 ${before} 的生命周期阶段不正确`,
        );
      }
    }

    // 检查 after 依赖是否在同一阶段
    for (const after of m.after) {
      const m1 = middlewares.find((m) => m.name === after);
      if (!m1) continue;
      const afterPhase = phaseIndex.get(m1.phase);
      if (afterPhase === undefined) continue;

      if (afterPhase != beforePhase) {
        return ErrCustomResult(
          `中间件 ${m.name} 依赖于 ${after} 的生命周期阶段不正确`,
        );
      }
    }
  }

  return Ok(null);
}

/**
 * 依赖图结构类型
 * 用于DAG拓扑排序
 */
type DependencyGraph = {
  depend: Map<string, string[]>; // 依赖关系映射：key 表示中间件，value 表示依赖它的中间件列表
  degree: Map<string, number>; // 入度映射：key 表示中间件，value 表示入度数
  vertex: string[]; // 顶点列表：无依赖的中间件名称数组
};

/**
 * 构建依赖图
 * 根据中间件的 before 和 after 依赖关系构建DAG图
 * @param middlewares - 标准化后的中间件描述符数组
 * @returns 构建成功返回依赖图，失败返回错误信息
 */
function buildDependencyGraph(
  middlewares: MiddlewareDescriptor[],
): Result<DependencyGraph> {
  const depend = new Map<string, string[]>();
  const degree = new Map<string, number>();
  const vertex: string[] = [];

  // 初始化所有中间件节点
  for (const m of middlewares) {
    depend.set(m.name, []);
    degree.set(m.name, 0);

    // 检查自引用
    if (m.before.includes(m.name) || m.after.includes(m.name)) {
      return ErrCustomResult(`中间件 ${m.name} 不能依赖于自己`);
    }

    // 检查重复添加
    const duplicate = vertex.find((v) => v === m.name);
    if (duplicate) {
      return ErrCustomResult(`中间件 ${m.name} 重复添加`);
    }


  }

  // 构建依赖关系
  for (const m of middlewares) {
    // 处理 before 依赖：A.before = [B] 表示 A 依赖于 B，即 B 应该在 A 之前执行
    for (const before of m.before) {
      if (middlewares.find((m) => m.name === before)) {
        console.log(`处理中间件 ${m.name} 的 before 依赖 ${before}`);
        depend.get(before)?.push(m.name);
        degree.set(m.name, degree.get(m.name)! + 1);
      } else {
        return ErrCustomResult(`中间件 ${before} 不存在`);
      }
    }

    // 处理 after 依赖：A.after = [B] 表示 A 依赖于 B，即 B 应该在 A 之后执行
    for (const after of m.after) {
      if (middlewares.find((m) => m.name === after)) {
        depend.get(m.name)?.push(after);
        degree.set(after, degree.get(after)! + 1);
      } else {
        return ErrCustomResult(`中间件 ${after} 不存在`);
      }
    }
  }

  // 根据入度统计无依赖的顶点
  for (const [k, v] of degree.entries()) {
    if (v === 0) {
      vertex.push(k);
    }
  }

  return Ok({ depend, degree, vertex });
}

/**
 * 计算数组的哈希值
 * 对数组元素排序后进行哈希计算，确保顺序无关性
 * @param arr - 字符串数组
 * @returns 哈希值（无符号32位整数）
 */
function hashSet(arr: string[]): number {
  return (
    [...arr].sort().reduce((acc, s) => {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
      return acc ^ h; // XOR叠加，顺序无关
    }, 0) >>> 0
  );
}

/**
 * DAG图拓扑排序
 * 根据中间件的依赖关系进行排序，支持同层 order 冲突检测
 * @param middlewares - 中间件配置数组
 * @returns 排序后的中间件描述符数组，或错误信息
 */
function topologicalSort(
  middlewares: MiddlewareConfig[],
): Result<MiddlewareDescriptor[]> {
  // 标准化并计算哈希值
  const normalizedMiddlewares = normalizeMiddlewareConfig(middlewares);
  const { v: graph, e } = buildDependencyGraph(normalizedMiddlewares);
  if (e) return Err(e, []);

  const { depend, degree, vertex } = graph;
  console.log("依赖关系图:", depend);
  console.log("入度映射:", degree);
  console.log("顶点列表:", vertex);

  const queue: MiddlewareDescriptor[] = [];
  const sorted: MiddlewareDescriptor[] = [];

  // 初始化队列：先将无依赖的中间件入队
  for (const v of vertex) {
    const m = normalizedMiddlewares.find((m) => m.name === v);
    if (m) queue.push(m);
  }

  // 拓扑排序主循环
  while (queue.length > 0) {
    // 按 order 排序确保同层执行顺序
    queue.sort((a, b) => a.order - b.order);
    const m = queue.shift()!;
    sorted.push(m);

    // 收集同层 order 冲突检测组
    const orderConflictGroup: MiddlewareDescriptor[] = [];

    // 处理当前中间件的依赖者
    for (const next of depend.get(m.name) ?? []) {
      degree.set(next, degree.get(next)! - 1);
      if (degree.get(next) === 0) {
        const nextMiddleware = normalizedMiddlewares.find(
          (m) => m.name === next,
        )!;
        queue.push(nextMiddleware);
        orderConflictGroup.push(nextMiddleware);
      }
    }

    // 同层 order 冲突检测：检查依赖相同但 order 不同的中间件
    if (orderConflictGroup.length > 1) {
      for (const m of orderConflictGroup) {
        for (const m1 of orderConflictGroup) {
          if (
            m !== m1 &&
            m.beforeHash === m1.beforeHash &&
            m.afterHash === m1.afterHash
          ) {
            // 依赖相同但 order 不同是正常的
            if (m.order === m1.order) {
              return ErrCustomResult(
                `中间件 ${m.name} 和 ${m1.name} 存在order冲突`,
              );
            }
          } else if (m == m1) {
            return ErrCustomResult(`中间件 ${m.name} 与 ${m1.name} 重复添加`);
          }
        }
      }
    }
  }

  // 检查是否存在循环依赖
  if (sorted.length !== middlewares.length) {
    return ErrCustomResult("中间件依赖关系存在循环");
  }

  return Ok(sorted);
}

/**
 * 生命周期处理函数映射类型
 * key: MiddlewarePhase - 生命周期阶段
 * value: 该阶段专属的处理函数数组，每个函数接收中间件配置数组，返回处理后的节点数组
 */
type CycleTypeFn = Map<
  MiddlewarePhase,
  (
    | ((cycleMiddlewares: MiddlewareDescriptor[]) => Result<MiddlewareNode[]>)
    | null
  )[]
>;

/**
 * 中间件排布函数
 * 根据生命周期阶段和依赖关系（before/after）对中间件进行排序和分组
 * @param middlewareConfigs - 中间件配置数组
 * @param cycleFns - 各生命周期阶段的专属处理函数映射
 * @returns 返回按阶段分组的中间件节点Map，或错误信息
 */
function middlewareArrange(
  middlewareConfigs: MiddlewareConfig[],
  cycleFns: CycleTypeFn,
): Result<Map<string, MiddlewareNode[]> | null> {
  // 跨生命周期依赖检查
  const acrossCycleCheck = acrossCycleDependencyCheck(middlewareConfigs);
  if (acrossCycleCheck.e) return Err(acrossCycleCheck.e!, null);

  const cycleMap = new Map<string, MiddlewareNode[]>();

  // 遍历所有生命周期阶段
  for (const cycle of Object.values(MiddlewarePhase)) {
    // 筛选属于当前阶段的中间件
    const cycleMiddlewares = middlewareCycleFilter(middlewareConfigs, cycle);

    // 拓扑排序确保正确的执行顺序
    const { v: sortedMiddlewares, e } = topologicalSort(cycleMiddlewares);
    if (e) return Err(e, null);

    // 应用该阶段专属的处理函数
    for (const fn of cycleFns.get(cycle) ?? []) {
      if (fn) {
        const { v: nodes, e } = fn(sortedMiddlewares);
        if (e) return Err(e, null);
        cycleMap.set(cycle, nodes);
      }
    }
  }

  return Ok(cycleMap);
}

/**
 * 路由管理器类
 * 作为整个路由系统的入口，管理根路由
 */
export class Router {
  private baseRouter: BaseRouter; // 根路由实例

  /**
   * 构造函数
   * @param fnHono - 创建Hono实例的函数
   */
  constructor(fnHono: RouterFn) {
    this.baseRouter = new BaseRouter("/", fnHono);
  }

  /**
   * 获取根路由实例
   * @returns BaseRouter 实例
   */
  getBaseRouter(): BaseRouter {
    return this.baseRouter;
  }

  /**
   * 启动路由系统
   * @returns 返回Result，成功返回null，失败返回错误信息
   */
  start(): Result<null> {
    const { e: baseE } = this.baseRouter.startRouter();
    if (baseE) return Err(baseE, null);

    return Ok(null);
  }
}

/**
 * 基础路由类
 * 负责管理单个路由节点，可以包含子路由组和具体的路由处理器
 */
export class BaseRouter {
  basePath: string; // 当前路由的基础路径
  private getHono: RouterFn; // 创建Hono实例的函数
  private fnMap: Map<string, { methodType: string; fn: HandlerFn }>; // 存储路由处理器的映射
  private methodPathMap: Map<string, BaseRouter>; // 存储子路由组的映射
  private middlewareConfigs: MiddlewareConfig[]; // 存储中间件配置的数组

  /**
   * 构造函数
   * @param basePath - 当前路由的基础路径
   * @param fn - 创建Hono实例的函数
   */
  constructor(basePath: string, fn: RouterFn) {
    this.basePath = basePath;
    this.getHono = fn;
    this.fnMap = new Map<string, { methodType: string; fn: HandlerFn }>();
    this.methodPathMap = new Map<string, BaseRouter>();
    this.middlewareConfigs = [];
  }

  /**
   * 注册中间件
   * @param config - 中间件配置对象
   * @returns 成功返回 Ok(null)，失败返回错误信息
   */
  midd(config: MiddlewareConfig): Result<null> {
    if (!config || !config.name || !config.fn) {
      return ErrValidationResult(null);
    }
    if (this.middlewareConfigs.find((m) => m.name === config.name)) {
      return ErrCustomResult(`中间件 ${config.name} 重复添加`);
    }
    this.middlewareConfigs.push(config);
    return Ok(null);
  }

  /**
   * 创建子路由组
   * @param groupName - 子路由组名称（同时作为基础路径）
   * @returns 返回新创建或已存在的子路由组实例
   */
  group(groupName: string): Result<BaseRouter | null> {
    if (!groupName) {
      return ErrValidationResult(null);
    }
    // 如果已存在同名路由组，直接返回
    if (this.methodPathMap.has(groupName)) {
      const api = this.methodPathMap.get(groupName);
      if (api) return Ok(api);
    }

    // 创建新的子路由组
    const api = new BaseRouter(groupName, () => Ok(new Hono()));
    this.methodPathMap.set(groupName, api);
    return Ok(api);
  }

  /**
   * 注册GET请求处理器
   * @param path - 请求路径
   * @param fn - 请求处理函数
   * @returns 成功返回 Ok(null)，失败返回错误信息
   */
  get(path: string, fn: HandlerFn): Result<null> {
    if (!path) {
      return ErrValidationResult(null);
    }

    // 检查路径是否已被注册
    if (this.fnMap.has(path)) {
      return ErrConTentRepeatResult(null);
    }
    this.fnMap.set(path, { methodType: "get", fn: fn });

    return Ok(null);
  }

  /**
   * 注册POST请求处理器（暂未实现）
   * @param path - 请求路径
   * @param fn - 请求处理函数
   * @returns 返回错误信息，表示暂不支持
   */
  // post(path: string, fn: HandlerFn): Result<null> {
  //   return ErrCustomResult("暂不支持post方法");
  // }

  /**
   * 启动当前路由节点，递归注册所有子路由和处理器
   * 注册顺序：中间件 -> 子路由组 -> 路由处理器
   * @returns 返回配置完成的Hono实例，或错误信息
   */
  startRouter(): Result<Hono> {
    // 检查是否有任何路由配置
    if (
      this.fnMap.size == 0 &&
      this.methodPathMap.size == 0 &&
      this.middlewareConfigs.length == 0
    ) {
      return ErrCustomResult("下级路由及中间件为空");
    }

    // 获取当前节点的唯一 Hono 实例
    const { v: hono, e } = this.getHono();
    if (e) {
      return Err(e, new Hono());
    }

    // 【时序修复 1】必须先注册中间件！
    const { e: middlewareE } = this.startMiddleware(hono);
    if (middlewareE) {
      return Err(middlewareE, new Hono());
    }

    // 【时序修复 2】再注册所有子路由组
    if (this.methodPathMap.size != 0) {
      for (const [k, v] of this.methodPathMap.entries()) {
        const { v: h, e } = v.startRouter();
        if (e) return Err(e, new Hono());
        try {
          hono.route(k, h);
        } catch (e) {
          return ErrCustomResult(`route 注册错误：${k}，错误信息：${e}`);
        }
      }
    }

    // 【时序修复 3】最后注册当前节点的路由处理器
    if (this.fnMap.size != 0) {
      for (const [k, v] of this.fnMap.entries()) {
        const { e } = this.methodTypeRegister(hono, k, v);
        if (e) return Err(e, new Hono());
      }
    }

    return Ok(hono);
  }

  /**
   * 启动中间件系统
   * 对中间件进行排序并注册到Hono实例
   * @param hono - Hono实例
   * @returns 成功返回 Ok(null)，失败返回错误信息
   */
  startMiddleware(hono: Hono): Result<null> {
    // 定义该阶段的处理函数
    const fn = (
      cycleMiddlewares: MiddlewareDescriptor[],
    ): Result<MiddlewareNode[]> => {
      return Ok(cycleMiddlewares);
    };

    const map = new Map<
      MiddlewarePhase,
      (
        | ((
          cycleMiddlewares: MiddlewareDescriptor[],
        ) => Result<MiddlewareNode[]>)
        | null
      )[]
    >();
    map.set(MiddlewarePhase.Default, [fn]);

    // 执行中间件排布
    const { v: middlewareNodes, e: middlewareError } = middlewareArrange(
      this.middlewareConfigs,
      map,
    );
    if (middlewareError) return Err(middlewareError, null);

    // 注册每个中间件到 Hono 实例
    middlewareNodes?.get(MiddlewarePhase.Default)?.forEach((m) => {
      this.registerMiddleware(hono, m);
    });
    return Ok(null);
  }

  /**
   * 注册单个中间件到Hono实例
   * @param hono - Hono实例
   * @param m - 中间件节点
   * @returns 成功返回 Ok(null)，失败返回错误信息
   */
  registerMiddleware(hono: Hono, m: MiddlewareNode): Result<null> {
    if (!m || !m.name) {
      return ErrValidationResult(null);
    }
    // 使用通配符 '*' 匹配所有路由
    hono.use("*", m.fn);
    return Ok(null);
  }

  /**
   * 根据HTTP方法类型注册路由处理器
   * @param hono - Hono实例
   * @param path - 请求路径
   * @param typeFn - 包含方法类型和处理函数的对象
   * @returns 成功返回 Ok(null)，失败返回错误信息
   */
  methodTypeRegister(
    hono: Hono,
    path: string,
    typeFn: { methodType: string; fn: HandlerFn },
  ): Result<null> {
    const { methodType: type, fn } = typeFn;
    try {
      switch (type) {
        case "get":
          hono.get(path, fn);
          return Ok(null);
        default:
          return ErrCustomResult(`route 注册失败：${path}`);
      }
    } catch (e) {
      return ErrCustomResult(`route 注册失败：${path}，错误信息：${e}`);
    }
  }
}
