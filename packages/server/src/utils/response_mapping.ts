import { Result } from "./result";
import {
  BaseError,
  CustomError,
  KVCacheError,
  RequestParmError,
  ValidationError,
} from "../error/error";
import { ContentfulStatusCode } from "hono/utils/http-status";

export type HttpResResponse<T> = {
  status: ContentfulStatusCode;
  body: { msg: string; value: T };
};

export type HttpErrorResponse = {
  status: ContentfulStatusCode;
  body: unknown;
};

type ErrorMapperItem = {
  type: string;

  map: (err: BaseError) => HttpErrorResponse | null;
};

type ResMapperItem = {
  type: string;

  map: <T>(res: { msg: string; v: T }) => HttpResResponse<T> | null;
};

export function ResponseMapping(
  it: ResMapperItem,
  ...items: ErrorMapperItem[]
) {
  return <T>(res: Result<T>): HttpErrorResponse | HttpResResponse<T> | null => {
    if (res.e && res.e instanceof BaseError) {
      const found = items.find((item) => item.type === res.e.type);

      if (!found) {
        return { status: 500, body: { msg: "未找到适配实现" } };
      }

      return found.map(res.e);
    } else {
      return it.map({ msg: res.msg, v: res.v });
    }
  };
}

export const RespMap = ResponseMapping(
  {
    type: "",
    map: <T>(res: { msg: string; v: T }): HttpResResponse<T> | null => {
      return { status: 200, body: { msg: res.msg, value: res.v } };
    },
  },
  {
    type: new RequestParmError().type,
    map: (err: BaseError) => {
      return { status: 400, body: { msg: err.message } };
    },
  },
  {
    type: new ValidationError().type,
    map: (err: BaseError) => {
      return { status: 400, body: { msg: err.message } };
    },
  },
  {
    type: new KVCacheError().type,
    map: (err: BaseError) => {
      return { status: 500, body: { msg: err.message } };
    },
  },
  {
    type: new CustomError().type,
    map: (err: BaseError) => {
      return { status: 500, body: { msg: err.message } };
    },
  },
);

export function requestParamErrorValidator(
  params: Record<string, unknown>,
): HttpErrorResponse | null {
  for (const [key, value] of Object.entries(params)) {
    if (value == null) {
      return {
        status: 400,
        body: {
          msg: `参数 ${key} 不能为空`,
        },
      };
    }
  }

  return null;
}
