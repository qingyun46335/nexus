import { previewTypeEnum } from "../utils/preview_type_mapping";

export type Article = {
    id: string,
    title: string,
    description: string,
    status: "published" | "draft" | "archived",
    createdAt: string,
    updatedAt: string,
    views: number,
    wordCount: number,
}

export type ArticleFile = {
    id: string,
    uuid: string,
    suffix: string,
    name: string,
    previewType: previewTypeEnum,
    size: number,
    filePath: string,
    relativePath: string,
    articleId: string,
}

export type UpdArticleInfor = {
    title: string,
    description: string,
    status: "published" | "draft" | "archived",
}