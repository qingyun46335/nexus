import { DrizzleD1Database } from "drizzle-orm/d1";
import { Ok, Result } from "../../utils/result";
import * as schema from "../../db/schema";
import { between, count, desc, eq, sql } from "drizzle-orm";

export class StatsService {
    async getArticleAndTagCount(db: DrizzleD1Database<typeof schema>): Promise<Result<{ total: number; published: number; draft: number; totalViews: number }>> {
        const total = await db.$count(schema.article);
        const published = await db.$count(schema.article, eq(schema.article.status, "published"));
        const draft = await db.$count(schema.article, eq(schema.article.status, "draft"));
        const totalViews = await db.select({ views: count(schema.article.views) }).from(schema.article).execute();

        return Ok({
            total,
            published,
            draft,
            totalViews: totalViews[0]?.views || 0,
        });
    }

    async getNewArticles(db: DrizzleD1Database<typeof schema>, dateFrom: string, dateTo: string): Promise<Result<{ date: string, value: number }[]>> {
        const result = await db.select({ date: sql<string>`date(${schema.article.createdAt})`, value: count(schema.article.id) }).from(schema.article).where(
            between(schema.article.createdAt, dateFrom, dateTo)
        ).groupBy(sql<string>`date(${schema.article.createdAt})`).execute();

        return Ok(result);
    }

    async getArticleViews(db: DrizzleD1Database<typeof schema>, dateFrom: string, dateTo: string): Promise<Result<{ date: string, value: number }[]>> {
        const result = await db.select({ date: sql<string>`date(${schema.article.createdAt})`, value: count(schema.article.views) }).from(schema.article).where(
            between(schema.article.createdAt, dateFrom, dateTo)
        ).groupBy(sql<string>`date(${schema.article.createdAt})`).execute();

        return Ok(result);
    }

    async getTagStats(db: DrizzleD1Database<typeof schema>): Promise<Result<{ name: string, count: number }[]>> {
        const result = await db.select({ name: schema.tag.name, count: schema.tag.views }).from(schema.tag).orderBy(desc(schema.tag.views)).execute();
        return Ok(result);
    }
}