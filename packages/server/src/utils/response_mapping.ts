import { Result } from "./result";
import {
  BaseError,
  BUCKETError,
  ContentNotFoundBusinessError,
  CustomError,
  DataError,
  DataFormatInvalidError,
  DBError,
  KVCacheError,
  RequestParmError,
  StatusValidateError,
  StorageCorruptedError,
  ValidationError,
} from "../error/error";
import { ContentfulStatusCode } from "hono/utils/http-status";

export type HttpResResponse<T> = {
  status: ContentfulStatusCode;
  body: { code?: number, msg: string; value: T };
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
      return { status: 200, body: { code: 200, msg: res.msg, value: res.v } };
    },
  },
  {
    type: new ContentNotFoundBusinessError().type,
    map: (err: BaseError) => {
      return { status: 200, body: { code: 300, msg: err.message } }
    }
  },
  {
    type: new DataError().type,
    map(err) {
      return { status: 200, body: { code: 350, msg: err.message } }
    },
  },
  {
    type: new StorageCorruptedError().type,
    map: (err: BaseError) => {
      return { status: 200, body: { code: 351, msg: err.message } }
    }
  },

  {
    type: new DataFormatInvalidError().type,
    map: (err: BaseError) => {
      return { status: 200, body: { code: 352, msg: err.message } }
    }
  },
  {
    type: new StatusValidateError().type,
    map(err) {
      return { status: 200, body: { code: 401, msg: err.message } }
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
    type: new DBError().type,
    map(err) {
      return { status: 500, body: { msg: err.message } }
    },
  },
  {
    type: new BUCKETError().type,
    map(err) {
      return { status: 500, body: { msg: err.message } }
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
