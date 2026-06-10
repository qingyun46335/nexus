import MarkdownIt, { Options } from "markdown-it";
import { Token, Renderer } from "markdown-it/index.js";

export type FileR2Path = {
  assetImageMap: Record<string, { id: string, url: string }>;
  attachmentMap: Record<string, { id: string, url: string }>;
  mediaMap: Record<string, { id: string, url: string }>;
};

export class MarkdownUtil {
  private md;

  private mapingResult: string[] = []

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
        this.mapingResult.push(assetImageMap[matchedKey].id)
        token.attrSet("src", assetImageMap[matchedKey].url);
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
        this.mapingResult.push(attachmentMap[matchedKey].id)
        token.attrSet("href", attachmentMap[matchedKey].url);
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
  ): { title: string; description: string; html: string, map: string[] } {
    const { title, description } = this.extractMeta(md);

    const processedEnv = {
      assetImageMap: extractFeatureKeys(env.assetImageMap),
      attachmentMap: extractFeatureKeys(env.attachmentMap),
      mediaMap: extractFeatureKeys(env.mediaMap),
    };

    const rawHtml = this.md.render(md, processedEnv);
    const html = this.replaceMediaSrc(rawHtml, processedEnv.mediaMap);

    const mr = this.mapingResult

    return { title, description, html, map: mr };
  }

  /**
 * 替换渲染后 HTML 中 <audio> / <video> 标签的 src 属性
 * 同时处理 <source src="..."> 子标签
 */
  private replaceMediaSrc(
    html: string,
    mediaMap: Record<string, { id: string, url: string }>,
  ): string {
    if (Object.keys(mediaMap).length === 0) return html;

    // 匹配 <audio ...>, <video ...>, <source ...> 中的 src="..."
    return html.replace(
      /(<(?:audio|video|source)\b[^>]*?\bsrc=")([^"]*?)(")/gi,
      (match, before, src, after) => {
        const normalizedSrc = decodeURIComponent(src).replace(/\\/g, "/");
        const matchedKey = Object.keys(mediaMap).find((k) =>
          normalizedSrc.endsWith(k),
        );
        if (matchedKey) {
          this.mapingResult.push(mediaMap[matchedKey].id)
        }
        return matchedKey
          ? `${before}${mediaMap[matchedKey].url}${after}`
          : match;
      },
    );
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
  map: Record<string, { id: string, url: string }>,
): Record<string, { id: string, url: string }> {
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
  const result: Record<string, { id: string, url: string }> = {};
  for (let i = 0; i < keys.length; i++) {
    const featureKey = normalizedKeys[i].slice(cutLen);
    result[featureKey] = map[keys[i]];
  }

  return result;
}

/**
 * 高性能 Markdown 字数统计
 * 策略：单遍扫描，零正则（可选），按需剥离 MD 语法
 */

interface WordCountResult {
  chars: number;        // 总字符数（不含空白）
  charsWithSpace: number; // 总字符数（含空白）
  cjk: number;          // 中日韩字符数（每个计 1 词）
  words: number;        // 西文单词数
  total: number;        // 估算总词数（cjk + words）
}

// CJK Unicode 范围检查（位运算，极快）
function isCJK(cp: number): boolean {
  return (
    (cp >= 0x4e00 && cp <= 0x9fff) ||  // CJK 统一汉字
    (cp >= 0x3400 && cp <= 0x4dbf) ||  // 扩展 A
    (cp >= 0x20000 && cp <= 0x2a6df) ||  // 扩展 B
    (cp >= 0x2a700 && cp <= 0x2ceaf) ||  // 扩展 C/D/E/F
    (cp >= 0xf900 && cp <= 0xfaff) ||  // 兼容汉字
    (cp >= 0x3040 && cp <= 0x30ff) ||  // 平假名/片假名
    (cp >= 0xac00 && cp <= 0xd7af)      // 韩文音节
  );
}

// 判断是否为空白字符
function isWhitespace(cp: number): boolean {
  return cp === 32 || cp === 9 || cp === 10 || cp === 13;
}

/**
 * 核心统计函数
 * @param text      原始 Markdown 文本
 * @param stripMd   是否剥离 Markdown 语法（默认 true）
 */
export function countMarkdown(text: string, stripMd = true): WordCountResult {
  const src = stripMd ? stripMarkdown(text) : text;
  return scanText(src);
}

/**
 * 单遍扫描，O(n)，无额外内存分配
 */
function scanText(text: string): WordCountResult {
  let chars = 0;
  let charsWithSpace = 0;
  let cjk = 0;
  let words = 0;
  let inWord = false;

  for (let i = 0; i < text.length; i++) {
    const cp = text.charCodeAt(i);

    // 处理 surrogate pair（扩展 CJK 区）
    let fullCp = cp;
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const lo = text.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        fullCp = ((cp - 0xd800) << 10) + (lo - 0xdc00) + 0x10000;
        i++; // 跳过低位 surrogate
      }
    }

    charsWithSpace++;

    if (isWhitespace(cp)) {
      if (inWord) { words++; inWord = false; }
      continue;
    }

    chars++;

    if (isCJK(fullCp)) {
      cjk++;
      if (inWord) { words++; inWord = false; } // CJK 切断西文词
    } else {
      inWord = true;
    }
  }

  if (inWord) words++; // 末尾单词

  return {
    chars,
    charsWithSpace,
    cjk,
    words,
    total: cjk + words,
  };
}

/**
 * 轻量 MD 语法剥离
 * 不引入任何依赖，单遍处理，跳过 code block / inline code /
 * heading markers / link syntax / image syntax / bold/italic
 */
function stripMarkdown(text: string): string {
  // 预分配 buffer（避免字符串拼接的 O(n²)）
  const buf = new Uint16Array(text.length);
  let out = 0;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const c = text.charCodeAt(i);

    // ``` 代码块
    if (c === 96 && text.charCodeAt(i + 1) === 96 && text.charCodeAt(i + 2) === 96) {
      i += 3;
      while (i < len) {
        if (text.charCodeAt(i) === 96 &&
          text.charCodeAt(i + 1) === 96 &&
          text.charCodeAt(i + 2) === 96) { i += 3; break; }
        i++;
      }
      buf[out++] = 32; // 用空格替代，保持词边界
      continue;
    }

    // ` 行内代码
    if (c === 96) {
      i++;
      while (i < len && text.charCodeAt(i) !== 96) i++;
      i++;
      buf[out++] = 32;
      continue;
    }

    // # 标题符号
    if (c === 35 && (i === 0 || text.charCodeAt(i - 1) === 10)) {
      while (i < len && text.charCodeAt(i) === 35) i++;
      while (i < len && text.charCodeAt(i) === 32) i++;
      continue;
    }

    // ![alt](url) 图片 → 保留 alt
    if (c === 33 && text.charCodeAt(i + 1) === 91) {
      i += 2;
      while (i < len && text.charCodeAt(i) !== 93) {
        buf[out++] = text.charCodeAt(i++);
      }
      // 跳过 (url)
      i++;
      if (text.charCodeAt(i) === 40) {
        while (i < len && text.charCodeAt(i) !== 41) i++;
        i++;
      }
      continue;
    }

    // [text](url) 链接 → 保留 text
    if (c === 91) {
      i++;
      while (i < len && text.charCodeAt(i) !== 93) {
        buf[out++] = text.charCodeAt(i++);
      }
      i++;
      if (text.charCodeAt(i) === 40) {
        while (i < len && text.charCodeAt(i) !== 41) i++;
        i++;
      }
      continue;
    }

    // * _ ~ 等格式符：跳过单个符号
    if (c === 42 || c === 95 || c === 126) { i++; continue; }

    // > 引用行首
    if (c === 62 && (i === 0 || text.charCodeAt(i - 1) === 10)) {
      i++;
      while (i < len && text.charCodeAt(i) === 32) i++;
      continue;
    }

    buf[out++] = c;
    i++;
  }

  // 从 Uint16Array 构建结果字符串（一次性，O(n)）
  return String.fromCharCode(...buf.subarray(0, out));
}
