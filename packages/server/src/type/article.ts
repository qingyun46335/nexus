import { previewTypeEnum } from "../utils/preview_type_mapping";

export type Article = {
    id: string,
    title: string,
    description: string,
    status: "published" | "draft" | "archived" | "hide",
    createdAt: string,
    updatedAt: string,
    views: number,
    likeCount: number,
    wordCount: number,
    tags: string,

}

export type ArticleFile = {
    id: string,
    uuid: string,
    suffix: string,
    name: string,
    previewType: previewTypeEnum,
    size: number,
    showInAttachment: 1 | 0,
    showInArticle: 1 | 0,
    clientFilePath: string,
    filePath: string,
    relativePath: string,
    articleId: string,
}

export type UpdArticleInfor = {
    title: string,
    description: string,
    status: "published" | "draft" | "archived" | "hide",
}

// client分页卡片

export type ArticleClientVo = {
    id: string,
    title: string,
    description: string,
    status: "published" | "draft" | "archived" | "hide",
    createdAt: string,
    updatedAt: string,
    views: number,
    wordCount: number,
    tags: string,
    attachments: {
        filename: string,
        size: number,
        type: previewTypeEnum,
        relativePath: string,
    }[],
}

// client文章阅读页

export type ArticleClientDetailVo = {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    views: number;
    likes: number;
    wordCount: number;
    tags: TagClinetVo[];
    files: ArticleFileClientVo[];
    content: string;
}

type PreviewType = "text" | "image" | "video" | "audio" | "unsupported";

export type ArticleFileClientVo = {
    id: string;
    suffix: string;
    name: string;
    previewType: PreviewType;
    size: number;
    clientFilePath: string;
    relativePath: string;
    articleId: string;

}

export type TagClinetVo = {
    id: string;
    name: string;
    views: number;
}

export type AdjacentArticle = {
    id: string;
    title: string;
    createdAt: string;
}

export type Adjacent = {
    prev: AdjacentArticle | null;
    next: AdjacentArticle | null;
}

export type RecommendedArticle = {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    wordCount: number;
    tags: TagClinetVo[];
}