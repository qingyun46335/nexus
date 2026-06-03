import { DrizzleD1Database } from "drizzle-orm/d1";
import { BaseConfig } from "../../config/base_config";
import { CustomError, KVCacheError } from "../../error/error";
import { FileMeta } from "../../route/admin/article_route";
import { countMarkdown, MarkdownUtil } from "../../utils/markdown_util";
import { ErrFrom, Ok, OkMsg, Result } from "../../utils/result";
import { article, articleFile } from "../../db/schema";
import { suffixIconMap } from "../../utils/preview_type_mapping";
import { Article, ArticleFile, UpdArticleInfor } from "../../type/article";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { formatHKTime } from "../../utils/time";
import * as schema from "../../db/schema";

const UPLOAD_FILES_NUM = "UPLOAD_FILES_NUM:";
const UPLOAD_META_MAPPING = "UPLOAD_META_MAPPING:";

type UploadMapping = {
  uuid: string;
  name: string;
  relativePath: string;
  suffix: string;
  MappingR2Name: string;
  MappingR2FilePath: string;
};

export class ArticleService {
  private mu: MarkdownUtil;

  constructor(mu: MarkdownUtil) {
    this.mu = mu;
  }

  public async getArticleList(
    db: DrizzleD1Database<typeof schema>,
    page: number,
    pageSize: number,
    keyword?: string,
    dateIntervalType?: "createdAt" | "updatedAt",
    dateFrom?: string,
    dateTo?: string,
    selectedTags?: string[],
  ): Promise<Result<{ total: number, rows: Article[] }>> {

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
        where att.article_id = a.id
      ) as tags
    `

    sql1.append(sql`select ${sql.raw(propMap)} from article a `)
    sql2.append(sql`select count(distinct a.id) as count from article a `)

    if (selectedTags != null && selectedTags.length > 0) {
      sql1.append(sql`left join article_to_tag att on a.id = att.article_id where att.tag_id in ${selectedTags} `)
      sql2.append(sql`left join article_to_tag att on a.id = att.article_id where att.tag_id in ${selectedTags} `)
    } else {
      sql1.append(sql`where 1=1 `)
      sql2.append(sql`where 1=1 `)
    }

    if (keyword) {
      const likeKeyword = `%${keyword}%`;
      sql1.append(sql`and (title like ${likeKeyword} or description like ${likeKeyword}) `)
      sql2.append(sql`and (title like ${likeKeyword} or description like ${likeKeyword}) `)
    }

    if (dateIntervalType && dateFrom && dateTo) {
      if (dateIntervalType === "createdAt") {
        sql1.append(sql`and created_at between ${dateFrom} and ${dateTo} `)
        sql2.append(sql`and created_at between ${dateFrom} and ${dateTo} `)
      } else if (dateIntervalType === "updatedAt") {
        sql1.append(sql`and updated_at between ${dateFrom} and ${dateTo} `)
        sql2.append(sql`and updated_at between ${dateFrom} and ${dateTo} `)
      }
    }

    sql1.append(sql`group by a.id LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`)

    const rows = await db.all(sql`
      ${sql1}
    `) as Article[];

    const [{ count: total }] = await db.all<{ count: number }>(sql`
      ${sql2}
    `);

    return Ok({ total, rows });
  }

  public async getArticleFiles(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<ArticleFile[]>> {
    const files = await db.select().from(articleFile).orderBy(
      sql`CASE
          WHEN ${articleFile.suffix} = 'md' THEN 0
          ELSE 1
        END`, desc(articleFile.suffix)
    ).where(eq(articleFile.articleId, articleId)).all();
    return Ok(files);
  }

  public async prepare(
    UPLOAD_KV: KVNamespace,
    db: DrizzleD1Database<typeof schema>,
    filesNum: number,
  ): Promise<Result<string>> {
    const uploadId = crypto.randomUUID();
    await UPLOAD_KV.put(UPLOAD_FILES_NUM + uploadId, String(filesNum));
    await UPLOAD_KV.put(UPLOAD_META_MAPPING + uploadId, "[]");

    await db.insert(article).values({
      id: uploadId,
      title: "",
      description: "",
      status: "draft",
      createdAt: formatHKTime(new Date().toISOString()),
      updatedAt: formatHKTime(new Date().toISOString()),
      views: 0,
      wordCount: 0,
      tags: "[]",
    }).run();

    return Ok(uploadId);
  }

  public async upload(
    UPLOAD_KV: KVNamespace,
    db: DrizzleD1Database<typeof schema>,
    NEXUS_FILE_BUCKET: R2Bucket,
    uploadId: string,
    fileMeta: FileMeta,
    file: File,
  ): Promise<Result<string | null>> {
    const array = await UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId);
    if (!array) {
      return ErrFrom(KVCacheError, "不存在此数据映射");
    }

    const meta_mapping = JSON.parse(array) as UploadMapping[];

    const fileId = crypto.randomUUID();
    await NEXUS_FILE_BUCKET.put(
      fileId +
      (fileMeta.suffix.indexOf(".") == -1
        ? "." + fileMeta.suffix
        : fileMeta.suffix),
      file,
    );

    meta_mapping.push({
      uuid: fileId,
      name: fileMeta.name,
      relativePath: fileMeta.relativePath,
      suffix: fileMeta.suffix,
      MappingR2Name:
        fileId +
        (fileMeta.suffix.indexOf(".") == -1
          ? "." + fileMeta.suffix
          : fileMeta.suffix),
      MappingR2FilePath:
        BaseConfig.assets.NEXUS_FILE_BUCKET +
        "/" +
        fileId +
        (fileMeta.suffix.indexOf(".") == -1
          ? "." + fileMeta.suffix
          : fileMeta.suffix),
    });

    await UPLOAD_KV.put(
      UPLOAD_META_MAPPING + uploadId,
      JSON.stringify(meta_mapping),
    );

    const previewType = suffixIconMap[fileMeta.suffix.charAt(0) === "." ? fileMeta.suffix.slice(1) : fileMeta.suffix] || "unsupported";

    await db.insert(articleFile).values({
      id: crypto.randomUUID(),
      uuid: fileId,
      suffix: fileMeta.suffix.charAt(0) === "." ? fileMeta.suffix.slice(1) : fileMeta.suffix,
      name: fileMeta.name,
      previewType: previewType,
      size: file.size,
      filePath: BaseConfig.assets.NEXUS_FILE_BUCKET + "/" + fileId + (fileMeta.suffix.indexOf(".") == -1 ? "." + fileMeta.suffix : fileMeta.suffix),
      relativePath: fileMeta.relativePath,
      articleId: uploadId,
    }).run();

    return OkMsg(`第${meta_mapping.length}个文件上传完成`, null);
  }

  public async uploadAfter(
    UPLOAD_KV: KVNamespace,
    db: DrizzleD1Database<typeof schema>,
    NEXUS_FILE_BUCKET: R2Bucket,
    uploadId: string,
  ): Promise<
    Result<{
      title: string;
      description: string;
      html: string;
    } | null>
  > {
    const raw = await UPLOAD_KV.get(UPLOAD_FILES_NUM + uploadId);

    if (raw === null) {
      return ErrFrom(KVCacheError, "不存在此uploadId");
    }
    const file_num = Number(raw);

    const array = await UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId);
    if (!array) {
      return ErrFrom(KVCacheError, "不存在此数据映射");
    }

    const meta_mapping = JSON.parse(array) as UploadMapping[];

    if (file_num != meta_mapping.length) {
      return ErrFrom(
        CustomError,
        `file_num计数：${file_num}，meta_mapping计数：${array.length}，数据不一致，`,
      );
    }

    const array1 = meta_mapping.filter((item) => {
      return item.suffix == "md" || item.suffix == ".md";
    });

    if (array1.length > 1) {
      let res = await delR2Upload(UPLOAD_KV, NEXUS_FILE_BUCKET, uploadId);
      if (res.e) {
        return res;
      }
      res = await delKVUpload(UPLOAD_KV, uploadId);
      if (res.e) {
        return res;
      }
      res = await delDbUpload(db, uploadId)
      if (res.e) {
        return res;
      }
      return ErrFrom(CustomError, "md文件多于一个请重新分开上传");
    } else if (array1.length == 0) {
      let res = await delR2Upload(UPLOAD_KV, NEXUS_FILE_BUCKET, uploadId);
      if (res.e) {
        return res;
      }
      res = await delKVUpload(UPLOAD_KV, uploadId);
      if (res.e) {
        return res;
      }
      res = await delDbUpload(db, uploadId)
      if (res.e) {
        return res;
      }
      return ErrFrom(CustomError, "md文件不存在");
    }

    const filePro = await NEXUS_FILE_BUCKET.get(array1[0].MappingR2Name);
    if (!filePro) {
      return ErrFrom(CustomError, "md文件不存在");
    }

    const mdContent: string = await filePro.text();

    const assetImageMap: Record<string, string> = {};
    const attachmentMap: Record<string, string> = {};
    const mediaMap: Record<string, string> = {};

    for (const item of meta_mapping) {
      switch (suffixIconMap[item.suffix] || "unsupported") {
        case "image":
          assetImageMap[item.relativePath] = item.MappingR2FilePath;
          break;
        case "video":
          mediaMap[item.relativePath] = item.MappingR2FilePath;
          break;
        case "audio":
          mediaMap[item.relativePath] = item.MappingR2FilePath;
          break;
        default:
          attachmentMap[item.relativePath] = item.MappingR2FilePath;
          break;
      }
    }

    const md_meta = this.mu.process(mdContent, {
      assetImageMap: assetImageMap,
      attachmentMap: attachmentMap,
      mediaMap: mediaMap,
    });

    await NEXUS_FILE_BUCKET.put(
      array1[0].MappingR2Name,
      md_meta.html
    );

    await db.update(article).set({
      title: md_meta.title,
      description: md_meta.description,
      updatedAt: formatHKTime(new Date().toISOString()),
      wordCount: countMarkdown(mdContent).total,
    }).where(eq(article.id, uploadId)).run();

    await delKVUpload(UPLOAD_KV, uploadId);

    return Ok(md_meta);
  }

  public async getArticle(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<Article>> {
    const res = await db.query.article.findFirst({
      where: (article, { eq }) => eq(article.id, articleId)
    })
    if (res) {
      return Ok(res)
    }
    return ErrFrom(CustomError, "数据获取失败")
  }

  /**
 * updArticleInfor
 */
  public async updArticleInfor(db: DrizzleD1Database<typeof schema>, article1: UpdArticleInfor, articleId: string, newSwitchTags: string[], delSwitchTags: string[]): Promise<Result<null>> {
    if (newSwitchTags && newSwitchTags.length > 0) {
      for (const tagId of newSwitchTags) {
        await db.insert(schema.articleToTag).values({
          id: crypto.randomUUID(),
          articleId: articleId,
          tagId: tagId
        })
      }
      await db.update(schema.tag).set({
        count: sql`${schema.tag.count} + 1`
      }).where(inArray(schema.tag.id, newSwitchTags)).run();
    }
    if (delSwitchTags && delSwitchTags.length > 0) {
      await db.delete(schema.articleToTag).where(and(eq(schema.articleToTag.articleId, articleId), inArray(schema.articleToTag.tagId, delSwitchTags)))
      await db.update(schema.tag).set({
        count: sql`MAX(${schema.tag.count} - 1, 0)`
      }).where(inArray(schema.tag.id, delSwitchTags)).run();
    }

    const switchTagIds = await db.query.articleToTag.findMany({
      where: sql`${schema.articleToTag.articleId} = ${articleId}`
    }).then(tags => {
      return tags.map(tag => tag.tagId)
    })

    const switchTagNames = await db.query.tag.findMany({
      where: sql`${schema.tag.id} in ${switchTagIds}`
    }).then(tags => {
      return tags.map(tag => tag.name)
    });

    await db.update(article).set({
      title: article1.title,
      description: article1.description,
      status: article1.status,
      updatedAt: formatHKTime(new Date().toISOString()),
      tags: JSON.stringify(switchTagNames),
    }).where(eq(article.id, articleId))

    return Ok(null)
  }
}

async function delDbUpload(db: DrizzleD1Database<typeof schema>, uploadId: string): Promise<Result<null>> {
  await db.delete(article).where(eq(article.id, uploadId))
  await db.delete(articleFile).where(eq(articleFile.articleId, uploadId))
  return Ok(null)
}

async function delR2Upload(
  UPLOAD_KV: KVNamespace,
  NEXUS_FILE_BUCKET: R2Bucket,
  uploadId: string,
): Promise<Result<null>> {
  const array = await UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId);
  if (!array) {
    return ErrFrom(KVCacheError, "不存在此数据映射");
  }

  const meta_mapping = JSON.parse(array) as UploadMapping[];

  const delNames = meta_mapping.map((item) => item.MappingR2Name);
  await NEXUS_FILE_BUCKET.delete(delNames);
  return Ok(null);
}

async function delKVUpload(
  UPLOAD_KV: KVNamespace,
  uploadId: string,
): Promise<Result<null>> {
  await UPLOAD_KV.delete(UPLOAD_FILES_NUM + uploadId);
  await UPLOAD_KV.delete(UPLOAD_META_MAPPING + uploadId);
  return Ok(null);
}
