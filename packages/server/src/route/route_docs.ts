import { Env, Hono } from "hono";
import { EnhancedRoute, Route } from "./route";
import { Ok, Result } from "../utils/result";
import { ApiDocCollector, ApiDocDef } from "../utils/api_doc_collector";
import { BlankSchema } from "hono/types";

export abstract class RouteDocs<E extends Env, S, G>
  extends Route<E, S, G>
  implements EnhancedRoute<E, S, G>
{
  private apiDocCollector: ApiDocCollector;

  constructor(apiDocCollector: ApiDocCollector, prefix?: string) {
    super(prefix);
    this.apiDocCollector = apiDocCollector;
  }

  protected docsFns: ((ad: ApiDocDef) => ApiDocDef)[] = [];
  setDocs(fn: (ad: ApiDocDef) => ApiDocDef): this {
    this.docsFns.push(fn);
    return this;
  }

  method(app: Hono<E, BlankSchema, "/">): Result<null> {
    let r = super.method(app);
    if (r.e) {
      return r;
    }
    r = this.docs();
    if (r.e) {
      return r;
    }
    return Ok(null);
  }

  docs(): Result<null> {
    let i = 0;
    for (const fn of this.docsFns) {
      let ad: ApiDocDef = {
        method: "GET",
        path: "",
        description: "",
      };
      ad = fn(ad);
      if (!ad.params) {
        ad.params = {};
      }
      if (!ad.body) {
        ad.body = {};
      }
      const methodInfors = this.getMethodInfors();
      ad.method = methodInfors[i].method;
      ad.path = methodInfors[i].fullPrefix + methodInfors[i].path;
      this.apiDocCollector.set(ad);
      i++;
    }
    return Ok(null);
  }
}
