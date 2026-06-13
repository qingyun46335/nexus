import { DrizzleD1Database } from "drizzle-orm/d1";
import { BaseConfig } from "../../config/base_config";
import { BUCKETError, CustomError, DataError, DataFormatInvalidError, DBError, KVCacheError, StatusValidateError } from "../../error/error";
import { FileMeta } from "../../route/admin/article_route";
import { countMarkdown, MarkdownUtil } from "../../utils/markdown_util";
import { ErrFrom, Ok, OkMsg, Result, to } from "../../utils/result";
import { article, articleFile } from "../../db/schema";
import { suffixIconMap } from "../../utils/preview_type_mapping";
import { Article, ArticleFile, UpdArticleInfor, Usage } from "../../type/article";

import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { formatHKTime } from "../../utils/time";
import * as schema from "../../db/schema";

type ResSwitchUsage = { e: null, v: D1Result<unknown> } | { e: Error, v: null } | null

export type UsageIdMap = Record<string, Usage>

const UPLOAD_FILES_NUM = "UPLOAD_FILES_NUM:";
const UPLOAD_META_MAPPING = "UPLOAD_META_MAPPING:";

const KV_DEFAULT_TIMEOUT = BaseConfig.kv.timeout

type UploadMapping = {
  id: string;
  uuid: string;
  name: string;
  relativePath: string;
  suffix: string;
  MappingR2Name: string;
  MappingR2FilePath: string;
  showInAttachmentAndArticle?: boolean;
  clientFilePath: string;
  usage?: Usage;
};

export class AdminArticleService {
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
      a.like_count as likeCount, 
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

    sql1.append(sql`group by a.id order by a.created_at desc LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`)

    const res1 = await to(db.all(sql`
              ${sql1}
            `));

    if (res1.e) {
      return ErrFrom(DBError, "数据库分页查询错误", res1.e)
    }

    const rows = res1.v as Article[]

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

    return Ok({ total, rows });
  }

  public async getArticleFiles(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<ArticleFile[]>> {
    const files = await to(db.select().from(articleFile).orderBy(
      sql`CASE
          WHEN ${articleFile.suffix} = 'md' THEN 0
          ELSE 1
        END`, desc(articleFile.suffix)
    ).where(eq(articleFile.articleId, articleId)).all());

    if (files.e) {
      return ErrFrom(DBError, "数据库查询失败", files.e)
    }

    return Ok(files.v);
  }

  public async prepare(
    UPLOAD_KV: KVNamespace,
    db: DrizzleD1Database<typeof schema>,
    filesNum: number,
  ): Promise<Result<string>> {
    const uploadId = crypto.randomUUID();
    let res = await to(UPLOAD_KV.put(UPLOAD_FILES_NUM + uploadId, String(filesNum), KV_DEFAULT_TIMEOUT));
    if (res.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
    }
    res = await to(UPLOAD_KV.put(UPLOAD_META_MAPPING + uploadId, "[]", KV_DEFAULT_TIMEOUT));
    if (res.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
    }

    const res1 = await to(db.insert(article).values({
      id: uploadId,
      title: "暂无",
      description: "暂无",
      status: "draft",
      createdAt: formatHKTime(new Date().toISOString()),
      updatedAt: formatHKTime(new Date().toISOString()),
      views: 0,
      likeCount: 0,
      wordCount: 0,
      tags: "[]",
    }).run());
    if (res1.e) {
      return ErrFrom(DBError, "数据库错误", res1.e)
    }

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
    const res = await to(UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId));
    if (res.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
    }

    if (!res.v) {
      return ErrFrom(KVCacheError, "不存在此数据映射");
    }

    // 获取此次上传之前的所有上传文件的信息映射
    const meta_mapping = JSON.parse(res.v) as UploadMapping[];

    const fileId = crypto.randomUUID();
    // 保存文件到r2
    const res1 = await to(NEXUS_FILE_BUCKET.put(
      fileId +
      (fileMeta.suffix.indexOf(".") == -1
        ? "." + fileMeta.suffix
        : fileMeta.suffix),
      file,
    ));

    if (res1.e) {
      return ErrFrom(BUCKETError, "文件保存错误", res1.e)
    }

    // 计算名称与路径
    const clientName = fileId + (fileMeta.suffix.indexOf(".") == -1 ? "." + fileMeta.suffix : fileMeta.suffix)
    const clientPath = "/" + clientName

    const id = crypto.randomUUID();

    meta_mapping.push({
      id: id,
      uuid: fileId,
      name: fileMeta.name,
      relativePath: fileMeta.relativePath,
      suffix: fileMeta.suffix,
      MappingR2Name:
        clientName,
      MappingR2FilePath:
        BaseConfig.assets.NEXUS_FILE_BUCKET +
        clientPath,
      showInAttachmentAndArticle: false,
      clientFilePath: clientPath,
      usage: "not_specified",
    });

    // 将新文件的信息和路径连同之前的文件信息一起重新保存到kv
    const res2 = await to(UPLOAD_KV.put(
      UPLOAD_META_MAPPING + uploadId,
      JSON.stringify(meta_mapping),
      KV_DEFAULT_TIMEOUT,
    ));

    if (res2.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res2.e)
    }

    // 计算预览类型（也是文件大类型）
    const previewType = suffixIconMap[fileMeta.suffix.charAt(0) === "." ? fileMeta.suffix.slice(1) : fileMeta.suffix] || "unsupported";

    // 将文件信息、路径、类型保存到数据库
    const res3 = await to(db.insert(articleFile).values({
      id: id,
      uuid: fileId,
      suffix: fileMeta.suffix.charAt(0) === "." ? fileMeta.suffix.slice(1) : fileMeta.suffix,
      name: fileMeta.name,
      previewType: previewType,
      size: file.size,
      showInAttachment: 0,
      showInArticle: 0,
      clientFilePath: clientPath,
      filePath: BaseConfig.assets.NEXUS_FILE_BUCKET + clientPath,
      relativePath: fileMeta.relativePath,
      articleId: uploadId,
      usage: "not_specified",
    }).run());

    if (res3.e) {
      return ErrFrom(DBError, "数据库错误", res3.e)
    }

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
    const res = await to(UPLOAD_KV.get(UPLOAD_FILES_NUM + uploadId));

    if (res.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
    }

    const raw = res.v

    if (raw === null) {
      return ErrFrom(KVCacheError, "不存在此uploadId");
    }
    const file_num = Number(raw);

    const res1 = await to(UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId));
    if (res1.e) {
      return ErrFrom(KVCacheError, "kv 数据库错误", res1.e)
    }
    const array = res1.v
    if (!array) {
      return ErrFrom(KVCacheError, "不存在此数据映射");
    }

    const meta_mapping = JSON.parse(array) as UploadMapping[];

    if (file_num != meta_mapping.length) {
      return ErrFrom(
        CustomError,
        `file_num计数：${file_num}，meta_mapping计数：${meta_mapping.length}，数据不一致，`,
      );
    }

    const res9 = await delKVUpload(UPLOAD_KV, uploadId);
    if (res9.e) return res9

    return Ok(null);
  }

  public async contentClassify(db: DrizzleD1Database<typeof schema>, articleId: string, usageMode?: boolean, uim?: UsageIdMap,): Promise<Result<null>> {
    const res = await to(db.select().from(articleFile).where(eq(articleFile.articleId, articleId)))
    if (res.e) {
      return ErrFrom(DBError, "数据库错误", res.e)
    }
    if (!res.v || res.v.length === 0) {
      return ErrFrom(DataError, "相关文件为空")
    }
    if (usageMode && uim && Object.keys(uim).length > 0) {
      if (Object.values(uim).filter(item => item === "content").length > 1) {
        return ErrFrom(DataFormatInvalidError, "主要内容只能存在一个")
      }
      for (const af of res.v) {
        if (af.id in uim) {
          const res = await this.switchUsage(uim[af.id], af.id, db,)
          if (res.e) {
            return res
          }
        } else {
          const res = await to(db.update(articleFile).set({ usage: "attachment" }).where(eq(articleFile.id, af.id)))
          if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
          }
        }
      }
    } else {
      const b = res.v.filter(item => item.suffix === "md" || item.suffix === ".md").length > 1
      for (const af of res.v) {
        if (b) {
          return ErrFrom(DataFormatInvalidError, "自动选择主要内容时，markdown 只能存在一个")
        }
        if (af.suffix === "md" || af.suffix === ".md") {
          const res = await to(db.update(articleFile).set({ usage: "content" }).where(eq(articleFile.id, af.id)))
          if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
          }
        } else {
          const res = await to(db.update(articleFile).set({ usage: "attachment" }).where(eq(articleFile.id, af.id)))
          if (res.e) {
            return ErrFrom(DBError, "数据库错误", res.e)
          }
        }
      }
    }
    return Ok(null)
  }

  public async parseMarkdown(db: DrizzleD1Database<typeof schema>, NEXUS_FILE_BUCKET: R2Bucket, articleId: string,): Promise<Result<null>> {
    const res = await to(db.query.articleFile.findFirst({
      where: and(eq(articleFile.articleId, articleId), eq(articleFile.usage, "content"))
    }))
    if (res.e) {
      return ErrFrom(DBError, "数据库错误", res.e)
    }
    if (!res.v) {
      return ErrFrom(DataError, "数据存在异常")
    }

    const clientName = res.v?.uuid + (res.v.suffix.indexOf(".") == -1 ? "." + res.v.suffix : res.v.suffix)

    const res2 = await to(NEXUS_FILE_BUCKET.get(clientName));
    if (res2.e) {
      return ErrFrom(BUCKETError, "r2 调用失败", res2.e)
    }
    const filePro = res2.v
    if (!filePro) {
      return ErrFrom(CustomError, "md文件不存在");
    }

    const res3 = await to(filePro.text());
    if (res3.e) return ErrFrom(CustomError, "文章提取失败", res3.e)

    const mdContent = res3.v

    const res1 = await to(db.query.articleFile.findMany({
      where: eq(articleFile.articleId, articleId)
    }))

    if (res1.e) {
      return ErrFrom(DBError, "数据库错误", res1.e)
    }

    if (!res1.v || res1.v.length === 0) {
      return ErrFrom(DataError, "数据存在异常")
    }

    const meta_mappings = res1.v

    const assetImageMap: Record<string, { id: string, url: string }> = {};
    const attachmentMap: Record<string, { id: string, url: string }> = {};
    const mediaMap: Record<string, { id: string, url: string }> = {};

    for (const item of meta_mappings) {
      switch (suffixIconMap[item.suffix] || "unsupported") {
        case "image":
          assetImageMap[item.relativePath] = { id: item.id, url: "/api/client/assets/image" + item.clientFilePath };
          break;
        case "video":
          mediaMap[item.relativePath] = { id: item.id, url: "/api/client/assets/video" + item.clientFilePath };
          break;
        case "audio":
          mediaMap[item.relativePath] = { id: item.id, url: "/api/client/assets/audio" + item.clientFilePath };
          break;
        default:
          attachmentMap[item.relativePath] = { id: item.id, url: "/api/client/assets/unsupported" + item.clientFilePath };
          break;
      }
    }

    const md_meta = this.mu.process(mdContent, {
      assetImageMap: assetImageMap,
      attachmentMap: attachmentMap,
      mediaMap: mediaMap,
    });

    let not_specified = []

    if (md_meta.map.length === 0) {
      not_specified.push(...meta_mappings.map(item => item.id))
    } else {
      const articleFileIds = new Set(md_meta.map);

      not_specified =
        meta_mappings
          .filter(item => !articleFileIds.has(item.id))
          .map(item => item.id);
    }

    if (md_meta.map.length !== 0) {
      const res5 = await to(db.update(articleFile).set(
        { showInArticle: 1 }
      ).where(sql`id in ${md_meta.map}`))
      if (res5.e) {
        return ErrFrom(DBError, "数据库错误", res5.e)
      }
    }

    if (not_specified && not_specified.length !== 0) {
      const res6 = await to(db.update(articleFile).set(
        { showInAttachment: 1 }
      ).where(sql`id in ${not_specified}`))
      if (res6.e) {
        return ErrFrom(DBError, "数据库错误", res6.e)
      }
    }

    //  新生成的文件重新上传
    const res7 = await to(NEXUS_FILE_BUCKET.put(
      clientName,
      md_meta.html
    ));
    if (res7.e) {
      return ErrFrom(BUCKETError, "r2 调用失败", res7.e)
    }

    //  更新数据库信息
    const res8 = await to(db.update(article).set({
      title: md_meta.title,
      description: md_meta.description,
      updatedAt: formatHKTime(new Date().toISOString()),
      wordCount: countMarkdown(mdContent).total,
    }).where(eq(article.id, articleId)).run());
    if (res8.e) return ErrFrom(DBError, "数据库异常", res8.e)

    return Ok(null)
  }

  async validateBeforePublish(db: DrizzleD1Database<typeof schema>, articleId: string,) {
    const res = await this.getArticleFilesByArticleId(db, articleId)
    if (res.e) {
      return res
    }
    if (res.v && Object.values(res.v).filter(item => item.value !== "not_specified").length === 0) {
      return ErrFrom(StatusValidateError, `所有文件均为"not_specified"`)
    }
    const res1 = await this.parseMarkdownStatus(db, articleId)
    if (res1.e) {
      return res1
    }
    if (res1.v === 0) {
      return ErrFrom(StatusValidateError, `markdown 解析未完成`)
    }

    return Ok(null)
  }

  async switchUsage(usage: Usage, articleFileId: string, db: DrizzleD1Database<typeof schema>): Promise<Result<null>> {
    // eslint-disable-next-line no-useless-assignment
    let res: ResSwitchUsage = null
    switch (usage) {
      case "content":
        res = await to(db.update(articleFile).set({ usage: "content" }).where(eq(articleFile.id, articleFileId)))
        break
      case "attachment":
        res = await to(db.update(articleFile).set({ usage: "attachment" }).where(eq(articleFile.id, articleFileId)))
        break
      case "not_specified":
        res = await to(db.update(articleFile).set({ usage: "not_specified" }).where(eq(articleFile.id, articleFileId)))
        break
      default:
        return ErrFrom(CustomError, "找不到对应Usage")
    }
    if (res.e) {
      return ErrFrom(DBError, "数据库错误", res.e)
    } else {
      return Ok(null)
    }
  }

  public async getArticle(db: DrizzleD1Database<typeof schema>, articleId: string): Promise<Result<Article>> {
    const res = await to(db.query.article.findFirst({
      where: (article, { eq }) => eq(article.id, articleId)
    }))
    if (res.e) {
      return ErrFrom(DBError, "数据获取失败", res.e)
    }
    if (res.v === undefined) return ErrFrom(DataError, "数据异常")
    return Ok(res.v)

  }

  /**
 * updArticleInfor
 */
  public async updArticleInfor(db: DrizzleD1Database<typeof schema>, article1: UpdArticleInfor, articleId: string, newSwitchTags: string[], delSwitchTags: string[]): Promise<Result<null>> {
    if (article1.status === "published") {
      const res = await this.validateBeforePublish(db, articleId)
      if (res.e) {
        return ErrFrom(StatusValidateError, "状态校验出现错误，无法发布，请检查流程是否执行完毕")
      }
    } else if (article1.status === "archived") {
      const res = await this.validateBeforePublish(db, articleId)
      if (res.e) {
        return ErrFrom(StatusValidateError, "状态校验出现错误，无法归档，请检查流程是否执行完毕")
      }
    }

    if (newSwitchTags && newSwitchTags.length > 0) {
      for (const tagId of newSwitchTags) {
        const res = await to(db.insert(schema.articleToTag).values({
          id: crypto.randomUUID(),
          articleId: articleId,
          tagId: tagId
        }))
        if (res.e) {
          return ErrFrom(DBError, "数据库错误", res.e)
        }
      }
      const res1 = await to(db.update(schema.tag).set({
        count: sql`${schema.tag.count} + 1`
      }).where(inArray(schema.tag.id, newSwitchTags)).run());
      if (res1.e) {
        return ErrFrom(DBError, "数据库错误", res1.e)
      }
    }
    if (delSwitchTags && delSwitchTags.length > 0) {
      const res2 = await to(db.delete(schema.articleToTag).where(and(eq(schema.articleToTag.articleId, articleId), inArray(schema.articleToTag.tagId, delSwitchTags))))
      if (res2.e) {
        return ErrFrom(DBError, "数据库错误", res2.e)
      }
      const res3 = await to(db.update(schema.tag).set({
        count: sql`MAX(${schema.tag.count} - 1, 0)`
      }).where(inArray(schema.tag.id, delSwitchTags)).run());
      if (res3.e) {
        return ErrFrom(DBError, "数据库错误", res3.e)
      }
    }

    const res4 = await to(db.query.articleToTag.findMany({
      where: sql`${schema.articleToTag.articleId} = ${articleId}`
    }).then(tags => {
      return tags.map(tag => tag.tagId)
    }))
    if (res4.e) {
      return ErrFrom(DBError, "数据库错误", res4.e)
    }
    const switchTagIds = res4.v

    const res5 = await to(db.query.tag.findMany({
      where: sql`${schema.tag.id} in ${switchTagIds}`
    }).then(tags => {
      return tags.map(tag => tag.name)
    }));
    if (res5.e) {
      return ErrFrom(DBError, "数据库错误", res5.e)
    }
    const switchTagNames = res5.v

    const res6 = await to(db.update(article).set({
      title: article1.title,
      description: article1.description,
      status: article1.status,
      updatedAt: formatHKTime(new Date().toISOString()),
      tags: JSON.stringify(switchTagNames),
    }).where(eq(article.id, articleId)))

    if (res6.e) {
      return ErrFrom(DBError, "数据库错误", res6.e)
    }

    return Ok(null)
  }

  async getArticleFilesByArticleId(db: DrizzleD1Database<typeof schema>, articleId: string,): Promise<Result<StatusSelectorItems>> {
    const files = await to(db.select().from(articleFile).orderBy(
      sql`CASE
          WHEN ${articleFile.suffix} = 'md' THEN 0
          ELSE 1
        END`, desc(articleFile.suffix)
    ).where(eq(articleFile.articleId, articleId)).all());

    if (files.e) {
      return ErrFrom(DBError, "数据库查询失败", files.e)
    }

    if (!files.v || files.v.length === 0) {
      return Ok({})
    }

    const res: StatusSelectorItems = {}
    for (const f of files.v) {
      res[f.name] = { id: f.id, value: f.usage }
    }

    return Ok(res)
  }

  // 方便推测当前markdown 是否被解析
  async parseMarkdownStatus(db: DrizzleD1Database<typeof schema>, articleId: string,): Promise<Result<number>> {
    const res = await to(db.$count(articleFile, and(or(ne(articleFile.showInArticle, 0), ne(articleFile.showInAttachment, 0),), eq(articleFile.articleId, articleId))))
    if (res.e) {
      return ErrFrom(DBError, "数据库错误", res.e)
    }
    return Ok(res.v)
  }
}

type StatusSelectorItems = Record<string, StatusSelectorItem>;

interface StatusSelectorItem {
  id: string;
  value: string;
}

async function delDbUpload(db: DrizzleD1Database<typeof schema>, uploadId: string): Promise<Result<null>> {
  const res = await to(db.delete(article).where(eq(article.id, uploadId)))
  if (res.e) {
    return ErrFrom(DBError, "数据库错误", res.e)
  }
  const res1 = await to(db.delete(articleFile).where(eq(articleFile.articleId, uploadId)))
  if (res1.e) {
    return ErrFrom(DBError, "数据库错误", res1.e)
  }
  return Ok(null)
}

async function delR2Upload(
  UPLOAD_KV: KVNamespace,
  NEXUS_FILE_BUCKET: R2Bucket,
  uploadId: string,
): Promise<Result<null>> {
  const res = await to(UPLOAD_KV.get(UPLOAD_META_MAPPING + uploadId));
  if (res.e) {
    return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
  }
  const array = res.v
  if (!array) {
    return ErrFrom(KVCacheError, "不存在此数据映射");
  }

  const meta_mapping = JSON.parse(array) as UploadMapping[];

  const delNames = meta_mapping.map((item) => item.MappingR2Name);
  const res1 = await to(NEXUS_FILE_BUCKET.delete(delNames));
  if (res1.e) {
    return ErrFrom(BUCKETError, "r2 调用失败", res1.e)
  }

  return Ok(null);
}

async function delKVUpload(
  UPLOAD_KV: KVNamespace,
  uploadId: string,
): Promise<Result<null>> {
  const res = await to(UPLOAD_KV.delete(UPLOAD_FILES_NUM + uploadId));
  if (res.e) {
    return ErrFrom(KVCacheError, "kv 数据库错误", res.e)
  }
  const res1 = await to(UPLOAD_KV.delete(UPLOAD_META_MAPPING + uploadId));
  if (res1.e) {
    return ErrFrom(KVCacheError, "kv 数据库错误", res1.e)
  }
  return Ok(null);
}
