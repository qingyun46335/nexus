export abstract class BaseError extends Error {
  public readonly cause?: Error;
  abstract readonly type: string;

  abstract readonly userMessage: string;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // 统一在基类修复原型链

    if (cause) {
      this.cause = cause;
      // 把 cause 的堆栈追加进来，方便直接 console.error 也能看到完整链
      this.stack += `\nCaused by: ${cause.stack ?? cause.message}`;
    }
  }

  /** 获取直接 cause */
  unwrap(): Error | undefined {
    return this.cause;
  }

  /** 递归展开整条错误链 */
  unwrapChain(): Error[] {
    const chain: Error[] = [this];
    let cur: Error | undefined = this.cause;
    while (cur) {
      chain.push(cur);
      cur = (cur as BaseError).cause;
    }
    return chain;
  }

  /** 在错误链中查找特定类型 */
  unwrapAs<T extends Error>(cls: new (...args: never[]) => T): T | undefined {
    return this.unwrapChain().find((e): e is T => e instanceof cls);
  }
}

export class ContentEmptyError extends BaseError {
  userMessage: string = "内容不能为空";
  type: string = "ContentEmptyError";
  constructor(message = "内容不能为空", cause?: Error) {
    super(message, cause);
  }
}

export class ValidationError extends BaseError {
  userMessage: string = "输入内容格式不正确";
  type: string = "ValidationError";
  constructor(message = "内容格式不正确", cause?: Error) {
    super(message, cause);
  }
}

export class ContentRepeatError extends BaseError {
  userMessage: string = "内容已存在";
  type: string = "ContentRepeatError";
  constructor(message = "内容已重复", cause?: Error) {
    super(message, cause);
  }
}

export class RequestParmError extends BaseError {
  userMessage: string = "请求参数错误";
  type: string = "RequestParmError";
  constructor(message = "请求参数错误", cause?: Error) {
    super(message, cause);
  }
}

// 中间件错误
export class KVCacheError extends BaseError {
  userMessage: string = "系统繁忙，请稍后重试";
  type: string = "KVCacheError";
  constructor(message = "KV  数据库错误", cause?: Error) {
    super(message, cause);
  }
}

export class DBError extends BaseError {
  userMessage: string = "系统繁忙，请稍后重试";
  type: string = "DBError"
  constructor(message = "数据库错误", cause?: Error) {
    super(message, cause)
  }
}

export class BUCKETError extends BaseError {
  userMessage: string = "文件服务暂时不可用";
  type: string = "BUCKETError"
  constructor(message = "r2存储错误", cause?: Error) {
    super(message, cause)
  }
}

export class CustomError extends BaseError {
  userMessage: string = "服务器内部错误";
  type: string = "CustomError";
  constructor(message = "未知异常", cause?: Error) {
    super(message, cause);
  }
}

// 业务错误
export class ContentNotFoundBusinessError extends BaseError {
  userMessage: string = "内容不存在或已被删除";
  type: string = "ContentNotFoundBusinessError";
  constructor(message = "文章为空", cause?: Error) {
    super(message, cause);
  }
}

export class StorageCorruptedError extends BaseError {
  userMessage: string = "数据异常，请联系管理员";
  type: string = "StorageCorruptedError"
  constructor(message = "存储损坏", cause?: Error) {
    super(message, cause)
  }
}

export class DataError extends BaseError {
  userMessage: string = "数据处理失败";
  type: string = "DataError"
  constructor(message = "数据异常", cause?: Error) {
    super(message, cause)
  }
}

export class DataFormatInvalidError extends BaseError {
  userMessage: string = "数据格式不正确";
  type: string = "DataFormatInvalidError"
  constructor(message = "数据格式异常", cause?: Error) {
    super(message, cause)
  }
}

export class DataValidateError extends BaseError {
  userMessage: string = "数据校验失败";
  type: string = "DataValidateError"
  constructor(message = "数据校验异常", cause?: Error) {
    super(message, cause)
  }
}

export class DataNotFindError extends BaseError {
  userMessage: string = "数据不存在";
  type: string = "DataNotFindError"
  constructor(message = "数据不存在", cause?: Error) {
    super(message, cause)
  }
}

export class StatusValidateError extends BaseError {
  userMessage: string = "当前状态不允许执行该操作";
  type: string = "StatusValidateError"
  constructor(message = "状态校验错误", cause?: Error) {
    super(message, cause)
  }
}

// 使用示例
// 1. 直接创建
// const r1 = Err<string>(new ValidationError("手机号格式错误"));

// 2. 包装底层异常（最常用场景）
// try {
//   JSON.parse("{{invalid");
// } catch (raw) {
//   const r2 = Err<string>(new ValidationError("解析失败", raw as Error));

//   if (r2.e) {
//     console.log(r2.e.message);          // "解析失败"
//     console.log(r2.e.cause?.message);   // "Unexpected token..."
//     console.log(r2.e.unwrapChain());    // [ValidationError, SyntaxError]
//     console.log(r2.e.stack);            // 完整链式堆栈
//   }
// }

// 3. 用 ErrFrom 工厂
// const r3 = ErrFrom<User>(CustomError, "创建用户失败", someDbError);

// 4. 在错误链中查找特定类型
// function handle(r: Result<string>) {
//   if (!r.e) return;
//   const valErr = r.e.unwrapAs(ValidationError);
//   if (valErr) { /* 专项处理校验错误 */ }
// }
