import { DrizzleD1Database } from "drizzle-orm/d1"
import * as schema from "../../db/schema";
import { ErrFrom, Ok, Result, to } from "../../utils/result";
import { Adjacent, AdjacentArticle, ArticleClientDetailVo, ArticleClientVo, RecommendedArticle } from "../../type/article";
import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { BUCKETError, ContentNotFoundBusinessError, CustomError, DataError, DBError, StorageCorruptedError } from "../../error/error";
import { article } from "../../db/schema";

export class ArticleService {
  public async getArticleList(
    db: DrizzleD1Database<typeof schema>,
    page: number,
    pageSize: number,
    keyword?: string,
    selectedTag?: string,
  ): Promise<Result<{ total: number, items: ArticleClientVo[], page: number, pageSize: number }>> {

    const sql1 = sql.empty()
    const sql2 = sql.empty()

    const propMap = `
          a.id as id, 
          a.title as title, 
          a.description as description, 
          a.status as status, 
          a.created_at as createdAt, 
          a.updated_at as updatedAt, 
          a.views as views, 
          a.word_count as wordCount, 
          (
            select json_group_array(t.name)
            from tag t
            left join article_to_tag att on t.id = att.tag_id
            where att.article_id = a.id and t.status = 'active'
          ) as tags, 
           (
            select json_group_array(
                json_object(
                'filename', atf.name,
                'size', atf.size,
                'type', atf.preview_type,
                'relativePath', atf.client_file_path
                )
            )
            from article_file atf 
            where atf.article_id = a.id and atf.suffix != 'md'
            ) as attachments
        `

    sql1.append(sql`select ${sql.raw(propMap)} from article a `)
    sql2.append(sql`select count(distinct a.id) as count from article a `)

    if (selectedTag != null && selectedTag != "") {
      sql1.append(sql`left join article_to_tag att on a.id = att.article_id where att.tag_id = ${selectedTag} `)
      sql2.append(sql`left join article_to_tag att on a.id = att.article_id where att.tag_id = ${selectedTag} `)
    } else {
      sql1.append(sql`where 1=1 `)
      sql2.append(sql`where 1=1 `)
    }

    if (keyword) {
      const likeKeyword = `%${keyword}%`;
      sql1.append(sql`and (title like ${likeKeyword} or description like ${likeKeyword}) `)
      sql2.append(sql`and (title like ${likeKeyword} or description like ${likeKeyword}) `)
    }

    sql1.append(sql`and a.status = "published" `)
    sql2.append(sql`and a.status = "published" `)

    // if (dateIntervalType && dateFrom && dateTo) {
    //     if (dateIntervalType === "createdAt") {
    //         sql1.append(sql`and created_at between ${dateFrom} and ${dateTo} `)
    //         sql2.append(sql`and created_at between ${dateFrom} and ${dateTo} `)
    //     } else if (dateIntervalType === "updatedAt") {
    //         sql1.append(sql`and updated_at between ${dateFrom} and ${dateTo} `)
    //         sql2.append(sql`and updated_at between ${dateFrom} and ${dateTo} `)
    //     }
    // }

    sql1.append(sql`group by a.id order by a.created_at desc LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`)

    const res1 = await to(db.all(sql`
          ${sql1}
        `));

    if (res1.e) {
      return ErrFrom(DBError, "数据库分页查询错误", res1.e)
    }

    const rows = res1.v as ArticleClientVo[]

    const res2 = await to(db.all<{ count: number }>(sql`
          ${sql2}
        `));

    if (res2.e) {
      return ErrFrom(DBError, "数据库分页统计查询错误", res2.e)
    }

    if (res2.v === undefined) {
      return ErrFrom(DataError, "分页统计数据异常")
    }

    const [{ count: total }] = res2.v

    if (rows != null && count != null && rows.length > 0 && total > 0) {
      return Ok({ total, items: rows, page, pageSize });
    }

    return ErrFrom(ContentNotFoundBusinessError, "无内容",)
  }

  public async getHotArticleList(
    db: DrizzleD1Database<typeof schema>,
    limit: number
  ): Promise<Result<ArticleClientVo[]>> {

    const sql1 = sql.empty()
    const sql2 = sql.empty()

    const propMap = `
          a.id as id, 
          a.title as title, 
          a.description as description, 
          a.status as status, 
          a.created_at as createdAt, 
          a.updated_at as updatedAt, 
          a.views as views, 
          a.word_count as wordCount, 
          (
            select json_group_array(t.name)
            from tag t
            left join article_to_tag att on t.id = att.tag_id
            where att.article_id = a.id and t.status = 'active'
          ) as tags, 
           (
            select json_group_array(
                json_object(
                'filename', atf.name,
                'size', atf.size,
                'type', atf.preview_type,
                'relativePath', atf.client_file_path
                )
            )
            from article_file atf 
            where atf.article_id = a.id and atf.suffix != 'md'
            ) as attachments
        `

    sql1.append(sql`select ${sql.raw(propMap)} from article a `)
    sql2.append(sql`select count(distinct a.id) as count from article a `)
    sql1.append(sql`where 1=1 `)
    sql2.append(sql`where 1=1 `)

    sql1.append(sql`and a.status = "published" `)
    sql2.append(sql`and a.status = "published" `)

    sql1.append(sql`group by a.id order by a.created_at desc LIMIT ${limit}`)

    const rows = await db.all(sql`
          ${sql1}
        `) as ArticleClientVo[];

    const [{ count: total }] = await db.all<{ count: number }>(sql`
          ${sql2}
        `);

    if (rows != null && count != null && rows.length > 0, total > 0) {
      return Ok(rows);
    }

    return ErrFrom(ContentNotFoundBusinessError, "无内容",)
  }

  async getArchiveMonth(db: DrizzleD1Database<typeof schema>,): Promise<Result<{
    label: string;   // e.g. "2026-06"
    count: number;
  }[]>> {
    const result = await to(db
      .select({
        label: sql<string>`substr(${article.createdAt}, 1, 7)`,
        count: count(article.id),
      })
      .from(article)
      .where(eq(article.status, "archived"))
      .groupBy(sql`substr(${article.createdAt}, 1, 7)`)
      .orderBy(desc(sql`substr(${article.createdAt}, 1, 7)`)));

    if (result.e) {
      return ErrFrom(DBError, "数据库查询失败", result.e)
    }

    if (result.v != null && result.v.length > 0) {
      return Ok(result.v)
    }

    return ErrFrom(ContentNotFoundBusinessError, "无内容")
  }

  async getArticleById(db: DrizzleD1Database<typeof schema>, NEXUS_FILE_BUCKET: R2Bucket, articleId: string,): Promise<Result<ArticleClientDetailVo>> {
    const art = await to(db.query.article.findFirst({
      where: and(eq(article.id, articleId), eq(article.status, "published"))
    }))

    if (art.e) {
      return ErrFrom(DBError, "数据库查询失败", art.e ?? undefined)
    }

    if (!art.v) {
      return ErrFrom(ContentNotFoundBusinessError, "数据为空")
    }

    const acdv: ArticleClientDetailVo = {
      id: art.v.id,
      title: art.v.title,
      description: art.v.description,
      createdAt: art.v.createdAt,
      updatedAt: art.v.updatedAt,
      views: art.v.views,
      likes: art.v.likeCount,
      wordCount: art.v.wordCount,
      tags: [],
      files: [],
      content: "",
    }

    const res = await to(Promise.all([
      db.select({
        id: schema.articleFile.id,
        suffix: schema.articleFile.suffix,
        name: schema.articleFile.name,
        previewType: schema.articleFile.previewType,
        size: schema.articleFile.size,
        clientFilePath: schema.articleFile.clientFilePath,
        relativePath: schema.articleFile.relativePath,
        articleId: schema.articleFile.articleId,
      }).from(schema.articleFile).where(and(eq(schema.articleFile.articleId, art.v.id), eq(schema.articleFile.showInAttachment, 1), ne(schema.articleFile.suffix, "md"))),
      db.select({
        id: schema.tag.id,
        name: schema.tag.name,
        views: schema.tag.views,
      }).from(schema.tag)
        .leftJoin(
          schema.articleToTag,
          eq(schema.tag.id, schema.articleToTag.tagId)
        ).where(eq(schema.articleToTag.articleId, art.v.id)),
      db.query.articleFile.findFirst({
        where: and(eq(schema.articleFile.articleId, art.v.id,), eq(schema.articleFile.suffix, "md"))
      }),
    ]))

    if (res.e) {
      return ErrFrom(DBError, "数据库查询失败", res.e)
    }

    if (!res.v) {
      return ErrFrom(ContentNotFoundBusinessError, "数据为空")
    }

    const [files, tags, articleMd] = res.v

    if (files && files.length > 0) {
      acdv.files = files
    }

    if (tags && tags.length > 0) {
      acdv.tags = tags
    }

    if (!articleMd) {
      return ErrFrom(ContentNotFoundBusinessError, "文章不存在")
    }

    const mdR2Obj = await to(NEXUS_FILE_BUCKET.get(articleMd.uuid + "." + articleMd.suffix))

    if (mdR2Obj.e) {
      return ErrFrom(BUCKETError, "r2 调用失败", mdR2Obj.e)
    }

    if (!mdR2Obj.v) {
      return ErrFrom(StorageCorruptedError, "文章内容丢失")
    }

    const context = await to(mdR2Obj.v.text())

    if (context.e) {
      return ErrFrom(CustomError, "文章提取失败")
    }

    if (!context.v) {
      return ErrFrom(StorageCorruptedError, "文章内容丢失")
    }

    acdv.content = context.v

    return Ok(acdv)

  }

  async adjacent(db: DrizzleD1Database<typeof schema>, articleId: string,): Promise<Result<Adjacent>> {
    const prevRes = await to(db.select({
      id: article.id,
      title: article.title,
      createdAt: article.createdAt
    }).from(article).where(sql`
        article.created_at > (
          select created_at from article a where id = ${articleId}
        )
      `).orderBy(asc(article.createdAt)).limit(1))

    if (prevRes.e) {
      return ErrFrom(DBError, "数据库查询失败", prevRes.e)
    }
    const prevArr = prevRes.v

    const nextRes = await to(db.select({
      id: article.id,
      title: article.title,
      createdAt: article.createdAt
    }).from(article).where(sql`
        article.created_at < (
          select created_at from article a where id = ${articleId}
        )
      `).orderBy(desc(article.createdAt)).limit(1))

    if (nextRes.e) {
      return ErrFrom(DBError, "数据库查询失败", nextRes.e)
    }
    const nextArr = nextRes.v

    const adja: Adjacent = {
      prev: prevArr[0] ?? null,
      next: nextArr[0] ?? null,
    }

    return Ok(adja)

  }

  async recommended(db: DrizzleD1Database<typeof schema>, limit: number,) {
    const s = sql`select 
          a.id as id, 
          a.title as title, 
          a.description as description, 
          a.created_at as createdAt, 
          a.word_count as wordCount, 
          (
            select json_group_array(
              json_object(
                'id', t.id, 
                'name', t.name, 
                'views', t.views 
              )
            )
            from tag t
            left join article_to_tag att on t.id = att.tag_id
            where att.article_id = a.id and t.status = 'active'
          ) as tags from article a order by a.views desc limit ${limit}`

    const res = await to(db.all(sql`${s}`))

    console.log("res: ", res)

    if (res.e) {
      return ErrFrom(DBError, "数据库查询失败", res.e)
    }

    const rows = res.v as RecommendedArticle[]

    return Ok(rows)
  }
}