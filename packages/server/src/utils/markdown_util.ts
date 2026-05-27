import MarkdownIt, { Options } from "markdown-it";
import { Token, Renderer } from "markdown-it/index.js";

export type FileR2Path = {
  assetImageMap: Record<string, string>;
  attachmentMap: Record<string, string>;
};

export class MarkdownUtil {
  private md;

  constructor() {
    this.md = new MarkdownIt({
      html: true, // 允许 HTML 标签透传
      linkify: true, // 自动识别 URL 变链接
      typographer: true, // 智能引号、破折号等
    });
    const defaultImageRenderer =
      this.md.renderer.rules.image ??
      ((
        tokens: Token[],
        idx: number,
        options: Options,
        env: unknown,
        self: Renderer,
      ) => {
        return self.renderToken(tokens, idx, options);
      });
    this.md.renderer.rules.image = (
      tokens: Token[],
      idx: number,
      options: Options,
      env: FileR2Path,
      self: Renderer,
    ) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex("src");
      const src = token.attrs?.[srcIndex]?.[1] || "";

      const normalizedSrc = this.normalizeSrc(src);
      const assetImageMap = env.assetImageMap;

      // 模糊匹配：找到 normalizedSrc 以哪个 featureKey 结尾
      const matchedKey = Object.keys(assetImageMap).find((k) =>
        normalizedSrc.endsWith(k),
      );
      if (matchedKey) {
        token.attrSet("src", assetImageMap[matchedKey]);
      }

      return defaultImageRenderer(tokens, idx, options, env, self);
    };

    const defaultLinkRenderer =
      this.md.renderer.rules.link_open ??
      ((
        tokens: Token[],
        idx: number,
        options: Options,
        env: FileR2Path,
        self: Renderer,
      ) => {
        return self.renderToken(tokens, idx, options);
      });
    this.md.renderer.rules.link_open = (
      tokens: Token[],
      idx: number,
      options: Options,
      env: FileR2Path,
      self: Renderer,
    ) => {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex("href");
      const href = token.attrs?.[hrefIndex]?.[1] || "";

      const normalizedHref = this.normalizeSrc(href);
      const attachmentMap = env.attachmentMap;

      const matchedKey = Object.keys(attachmentMap).find((k) =>
        normalizedHref.endsWith(k),
      );
      if (matchedKey) {
        token.attrSet("href", attachmentMap[matchedKey]);
      }

      return defaultLinkRenderer(tokens, idx, options, env, self);
    };
  }

  extractMeta(md: string): { title: string; description: string } {
    const tokens = this.md.parse(md, {});

    let title = "";
    let description = "";

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const next = tokens[i + 1];

      // 提取标题
      if (!title && tok.type === "heading_open" && /^h[1-5]$/.test(tok.tag)) {
        if (next?.type === "inline") {
          title = next.content.trim();
        }
      }

      // 提取描述
      if (!description && tok.type === "paragraph_open") {
        if (next?.type === "inline") {
          description = next.content
            .replace(/[*_`[\]]/g, "")
            .trim()
            .slice(0, 160);
        }
      }

      if (title && description) break;
    }

    return { title, description };
  }

  process(
    md: string,
    env: FileR2Path,
  ): { title: string; description: string; html: string } {
    const { title, description } = this.extractMeta(md);
    return {
      title: title,
      description: description,
      html: this.md.render(md, {
        assetImageMap: extractFeatureKeys(env.assetImageMap),
        attachmentMap: extractFeatureKeys(env.attachmentMap),
      }),
    };
  }

  private normalizeSrc(src: string): string {
    return decodeURIComponent(src).replace(/\\/g, "/");
  }
}

/**
 * 提取所有 key 的公共前缀后裁剪，返回特征路径作为新 key，value 不变
 * 输入：{ 'C:\\md\\a.png': 'uuid-a.png', 'C:\\md\\b.png': 'uuid-b.png' }
 * 输出：{ 'a.png': 'uuid-a.png', 'b.png': 'uuid-b.png' }
 */
export function extractFeatureKeys(
  map: Record<string, string>,
): Record<string, string> {
  const keys = Object.keys(map);
  if (keys.length === 0) return {};

  // 1. decode + 统一斜杠
  const normalizedKeys = keys.map((k) =>
    decodeURIComponent(k).replace(/\\/g, "/"),
  );

  // 2. 逐字符找公共前缀，遇到不同字符停止
  let prefixLen = 0;
  const minLen = Math.min(...normalizedKeys.map((k) => k.length));

  for (let i = 0; i < minLen; i++) {
    const ch = normalizedKeys[0][i];
    if (normalizedKeys.every((k) => k[i] === ch)) {
      prefixLen = i + 1;
    } else {
      break;
    }
  }

  // 3. 回退到最后一个 / 处
  const prefix = normalizedKeys[0].slice(0, prefixLen);
  const lastSlash = prefix.lastIndexOf("/");
  const cutLen = lastSlash >= 0 ? lastSlash + 1 : prefixLen;

  // 4. 裁剪，重建 map
  const result: Record<string, string> = {};
  for (let i = 0; i < keys.length; i++) {
    const featureKey = normalizedKeys[i].slice(cutLen);
    result[featureKey] = map[keys[i]];
  }

  return result;
}
