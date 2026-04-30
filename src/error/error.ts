import { Result } from "../utils/result";

// 1. 内容为空异常
export class ContentEmptyError extends Error {
  constructor(message: string = "内容不能为空") {
    super(message);
    this.name = "ContentEmptyError";
    // 修复原型链
    Object.setPrototypeOf(this, ContentEmptyError.prototype);
  }
}

export const ErrContentEmptyResult = <T>(value: T): Result<T> => ({
    v: value,
    e: new ContentEmptyError
});

// 2. 内容错误/校验失败异常
export class ValidationError extends Error {
  constructor(message: string = "内容格式不正确") {
    super(message);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export const ErrValidationResult = <T>(value: T): Result<T> => ({
    v: value,
    e: new ValidationError
});

export class ConTentRepeatError extends Error {
  constructor(message: string = "内容已重复") {
    super(message);
    this.name = "ConTentRepeatError";
    Object.setPrototypeOf(this, ConTentRepeatError.prototype);
  }
}

export const ErrConTentRepeatResult = <T>(value: T): Result<T> => ({
    v: value,
    e: new ConTentRepeatError
});

export class CustomError extends Error {
  constructor(message: string = "未知异常") {
    super(message);
    this.name = "CustomError";
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const ErrCustomResult = <T>(message: string): Result<T> => ({
    v: null as unknown as T,
    e: new CustomError(message)
});