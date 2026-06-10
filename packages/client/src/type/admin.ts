export interface AdminArticle {
    id: string;
    title: string;
    description: string;
    tags: string;
    status: "published" | "draft" | "archived" | "hide";
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
    showInAttachment: 1 | 0,
    showInArticle: 1 | 0,
    clientFilePath: string;
    filePath: string;
    relativePath: string;
    articleId: string;
}

export const PreviewType = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    UNSUPPORTED: 'unsupported'
}

export interface TagItem {
    id: string;
    name: string;
    count: number;
    status: "active" | "inactive";
}

export interface TagEditItem extends TagItem {
    // 可以添加一些编辑相关的属性，例如是否正在编辑等
    isEditing?: boolean;
}

export interface ArticleListResponse {
    value: AdminArticle[];
    data: AdminArticle[];
    total: number;
    page: number;
    pageSize: number;
}