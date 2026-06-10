import { DrizzleD1Database } from "drizzle-orm/d1";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import * as schema from "../../db/schema";
import { between, count, desc, eq, sql } from "drizzle-orm";
import { DBError } from "../../error/error";

export class AdminStatsService {
    async getArticleAndTagCount(db: DrizzleD1Database<typeof schema>): Promise<Result<{ total: number; published: number; draft: number; totalViews: number }>> {

        const res = await to(Promise.all([
            db.$count(schema.article),
            db.$count(schema.article, eq(schema.article.status, "published")),
            db.$count(schema.article, eq(schema.article.status, "draft")),
            db.select({ views: count(schema.article.views) }).from(schema.article).execute(),
        ]))

        if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
        }

        const [total,
            published,
            draft,
            totalViews] = res.v

        return Ok({
            total,
            published,
            draft,
            totalViews: totalViews[0]?.views || 0,
        });
    }

    async getNewArticles(db: DrizzleD1Database<typeof schema>, dateFrom: string, dateTo: string): Promise<Result<{ date: string, value: number }[]>> {
        const result = await to(db.select({ date: sql<string>`date(${schema.article.createdAt})`, value: count(schema.article.id) }).from(schema.article).where(
            between(schema.article.createdAt, dateFrom, dateTo)
        ).groupBy(sql<string>`date(${schema.article.createdAt})`).execute());

        if (result.e) {
            return ErrFrom(DBError, "数据库错误", result.e)
        }

        return Ok(result.v);
    }

    async getArticleViews(db: DrizzleD1Database<typeof schema>, dateFrom: string, dateTo: string): Promise<Result<{ date: string, value: number }[]>> {
        const result = await to(db.select({ date: sql<string>`date(${schema.article.createdAt})`, value: count(schema.article.views) }).from(schema.article).where(
            between(schema.article.createdAt, dateFrom, dateTo)
        ).groupBy(sql<string>`date(${schema.article.createdAt})`).execute());

        if (result.e) {
            return ErrFrom(DBError, "数据库错误", result.e)
        }

        return Ok(result.v);
    }

    async getTagStats(db: DrizzleD1Database<typeof schema>): Promise<Result<{ name: string, count: number }[]>> {
        const result = await to(db.select({ name: schema.tag.name, count: schema.tag.views }).from(schema.tag).orderBy(desc(schema.tag.views)).execute());

        if (result.e) {
            return ErrFrom(DBError, "数据库错误", result.e)
        }

        return Ok(result.v);
    }
}