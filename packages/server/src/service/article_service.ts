import { BaseConfig } from "../config/base_config";
import { CustomError, KVCacheError } from "../error/error";
import { FileMeta } from "../route/article_route";
import { MarkdownUtil } from "../utils/markdown_util";
import { ErrFrom, Ok, OkMsg, Result } from "../utils/result";

const UPLOAD_FILES_NUM = "UPLOAD_FILES_NUM:";
const UPLOAD_META_MAPPING = "UPLOAD_META_MAPPING:";

type UploadMapping = {
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

  public async prepare(
    UPLOAD_KV: KVNamespace,
    filesNum: number,
  ): Promise<Result<string>> {
    const uploadId = crypto.randomUUID();
    await UPLOAD_KV.put(UPLOAD_FILES_NUM + uploadId, String(filesNum));
    await UPLOAD_KV.put(UPLOAD_META_MAPPING + uploadId, "[]");
    return Ok(uploadId);
  }

  public async upload(
    UPLOAD_KV: KVNamespace,
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

    return OkMsg(`第${meta_mapping.length}个文件上传完成`, null);
  }

  public async uploadAfter(
    UPLOAD_KV: KVNamespace,
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
      return ErrFrom(CustomError, "md文件不存在");
    }

    const filePro = await NEXUS_FILE_BUCKET.get(array1[0].MappingR2Name);
    if (!filePro) {
      return ErrFrom(CustomError, "md文件不存在");
    }

    const mdContent: string = await filePro.text();

    const assetImageMap: Record<string, string> = {};
    const attachmentMap: Record<string, string> = {};

    for (const item of meta_mapping) {
      if (
        item.suffix === "jpg" ||
        item.suffix === ".jpg" ||
        item.suffix === "png" ||
        item.suffix === ".png"
      ) {
        assetImageMap[item.relativePath] = item.MappingR2FilePath;
      } else {
        attachmentMap[item.relativePath] = item.MappingR2FilePath;
      }
    }

    const md_meta = this.mu.process(mdContent, {
      assetImageMap: assetImageMap,
      attachmentMap: attachmentMap,
    });

    return Ok(md_meta);
  }
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
