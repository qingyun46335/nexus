import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { previewTypeEnum } from "../utils/preview_type_mapping";

export const article = sqliteTable("article", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").$type<"published" | "draft" | "archived" | "hide">().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  views: integer("views").notNull(),
  likeCount: integer("like_count").notNull(),
  wordCount: integer("word_count").notNull(),
  tags: text("tags").notNull(),
});

export const articleFile = sqliteTable("article_file", {
  id: text("id").primaryKey(),
  uuid: text("uuid").notNull(),
  suffix: text("suffix").notNull(),
  name: text("name").notNull(),
  previewType: text("preview_type").$type<previewTypeEnum>().notNull(),
  size: integer("size").notNull(),
  // displayType: text("display_type").$type<"not_specified" | "attachment" | "article_file" | "all">().notNull(),
  showInArticle: integer("show_in_article").$type<1 | 0>().notNull(),
  showInAttachment: integer("show_in_attachment").$type<1 | 0>().notNull(),
  clientFilePath: text("client_file_path").notNull(),
  filePath: text("file_path").notNull(),
  relativePath: text("relative_path").notNull(),
  articleId: text("article_id").notNull(),
})

export const tag = sqliteTable("tag", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  count: integer("count").notNull(),  //  关联文章数
  views: integer("views").notNull(), // 标签总浏览数
  status: text("status").$type<"active" | "inactive">().notNull(),
})

export const articleToTag = sqliteTable("article_to_tag", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull(),
  tagId: text("tag_id").notNull(),
})