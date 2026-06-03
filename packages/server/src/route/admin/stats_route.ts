import { Hono } from "hono";
import { BlankSchema } from "hono/types";
import { Ok, Result } from "../../utils/result";
import { VarsAndBindingsEnv } from "../route";
import { RouteDocs } from "../route_docs";
import { StatsService } from "../../service/admin/stats_service";
import { getDb } from "../../utils/sqlite";


export type AdminStatsRouteSetEnv = object;

export type AdminStatsRouteGetEnv = object;

export type AdminStatsRouteBindings = {
    nexus_db: D1Database;
};

export class AdminStatsRoute extends RouteDocs<
    VarsAndBindingsEnv<
        AdminStatsRouteSetEnv,
        AdminStatsRouteGetEnv,
        AdminStatsRouteBindings
    >, AdminStatsRouteSetEnv, AdminStatsRouteGetEnv
> {

    private ss = new StatsService();

    setRoutePrefix(): string | null {
        return "/stats";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    midd(app: Hono<VarsAndBindingsEnv<object, object, AdminStatsRouteBindings>, BlankSchema, "/">): Result<null> {
        return Ok(null);
    }
    setupMehods(r: this): void {
        r.setDocsMethod(app => {
            app.get("/sidebar", async c => {
                const { start, end } = getLastMonthRange();
                const overview = await this.ss.getArticleAndTagCount(getDb(c.env));
                const dailyArticles = await this.ss.getNewArticles(getDb(c.env), start, end);
                const dailyViews = await this.ss.getArticleViews(getDb(c.env), start, end);
                const topTags = await this.ss.getTagStats(getDb(c.env));
                if (!overview.e && !dailyArticles.e && !dailyViews.e && !topTags.e) {
                    return c.json({ overview: overview.v, dailyArticles: dailyArticles.v, dailyViews: dailyViews.v, topTags: topTags.v });
                }
                return c.json({ msg: "获取数据失败" }, 500)
            })
        })
    }
}

function getLastMonthRange(): { start: string; end: string } {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() 是 0-indexed，所以不用 -1

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    return { start, end };
}