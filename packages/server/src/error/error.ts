export class BaseError extends Error {
  public readonly cause?: Error;

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
  constructor(message = "内容不能为空", cause?: Error) {
    super(message, cause);
  }
}

export class ValidationError extends BaseError {
  constructor(message = "内容格式不正确", cause?: Error) {
    super(message, cause);
  }
}

export class ContentRepeatError extends BaseError {
  constructor(message = "内容已重复", cause?: Error) {
    super(message, cause);
  }
}

export class CustomError extends BaseError {
  constructor(message = "未知异常", cause?: Error) {
    super(message, cause);
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