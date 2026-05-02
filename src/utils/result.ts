import { BaseError } from "../error/error";

export type Result<T> = { v: T; e: null } | { v: null; e: BaseError };

export const Ok = <T>(value: T): Result<T> => ({ v: value, e: null });

export const Err = <T>(err: BaseError): Result<T> => ({ v: null, e: err });

// 便捷工厂：wrap 一个底层 Error 为自定义类型
export const ErrFrom = <T>(
    cls: new (msg: string, cause?: Error) => BaseError,
    message: string,
    cause?: Error
): Result<T> => ({ v: null, e: new cls(message, cause) });