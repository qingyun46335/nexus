export interface AdminArticle {
    id: string;
    title: string;
    description: string;
    tags: string[];
    status: "published" | "draft" | "archived";
    createdAt: string;
    updatedAt: string;
    views: number;
    wordCount: number;
}

export interface AdminArticleFile {
    id: string;
    uuid: string;
    suffix: string;
    name: string;
    previewType: string;
    previewPath: string;
    size: string;
    filePath: string;
    relativePath: string;
    articleId: string;
}

export const PreviewType = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    OFFICE: 'office',
    UNSUPPORTED: 'unsupported'
}

export interface TagItem {
    name: string;
    count: number;
    status: "active" | "inactive";
}

export interface TagEditItem extends TagItem {
    // 可以添加一些编辑相关的属性，例如是否正在编辑等
    isEditing?: boolean;
}

export interface ArticleListResponse {
    data: AdminArticle[];
    total: number;
    page: number;
    pageSize: number;
}