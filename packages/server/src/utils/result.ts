import { BaseError } from "../error/error";

export type Result<T> = { v: T; e: null, msg: string } | { v: null; e: BaseError, msg: string };

export const Ok = <T>(value: T): Result<T> => ({ v: value, e: null, msg: "" });

export const OkMsg = <T>(msg: string, value: T): Result<T> => ({ v: value, e: null, msg: msg });

export const Err = <T>(err: BaseError): Result<T> => ({ v: null, e: err, msg: err.message });

// 便捷工厂：wrap 一个底层 Error 为自定义类型
export const ErrFrom = <T>(
    cls: new (msg: string, cause?: Error) => BaseError,
    message: string,
    cause?: Error
): Result<T> => ({ v: null, e: new cls(message, cause), msg: message });