import { html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { marked } from "marked";
// import hljs from "highlight.js";

import { DaisyUIElement } from "../components/daisy-ui-element";

// 引入 Highlight.js 的亮色和暗色主题 (这里以 GitHub 主题为例，具体视你的构建工具配置而定)
// 如果你使用 Vite，可以通过 ?inline 引入 CSS 字符串
import hljsLight from "highlight.js/styles/github.css?inline";
import hljsDark from "highlight.js/styles/github-dark.css?inline";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

@customElement("md-reader")
export class MdReader extends DaisyUIElement {
  // 传入的 Markdown 原始文本
  @property({ type: String })
  content = "";

  // 监听外部的暗黑模式状态，方便与 DaisyUI 联动
  @property({ type: Boolean, reflect: true })
  isDark = false;

  static defaultStyles = css`
    :host {
      display: block;
      /* 使用 DaisyUI 的 CSS 变量作为基础色 */
      color: var(--bc);
      line-height: 1.75;
    }

    /* --- Highlight.js 样式容器隔离 --- */
    .hljs-light {
      display: block;
    }
    .hljs-dark {
      display: none;
    }

    /* 当外部传入 isDark 时，反转 Highlight.js 的显示状态 */
    :host([isDark]) .hljs-light {
      display: none;
    }
    :host([isDark]) .hljs-dark {
      display: block;
    }

    /* --- Markdown 基础排版 (替代 Typography 插件) --- */
    .markdown-body {
      max-width: 65ch; /* 适合阅读的完美行宽 */
      margin: 0 auto;
      padding: 1rem;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      color: var(--bc);
      font-weight: 700;
      margin-top: 2em;
      margin-bottom: 1em;
      line-height: 1.3;
    }

    h1 {
      font-size: 2.25rem;
      border-bottom: 1px solid var(--b3);
      padding-bottom: 0.3em;
    }
    h2 {
      font-size: 1.5rem;
      border-bottom: 1px solid var(--b3);
      padding-bottom: 0.3em;
    }
    h3 {
      font-size: 1.25rem;
    }

    p,
    ul,
    ol {
      margin-bottom: 1.25em;
    }

    ul {
      list-style-type: disc;
      padding-left: 1.5em;
    }
    ol {
      list-style-type: decimal;
      padding-left: 1.5em;
    }

    blockquote {
      border-left: 4px solid var(--p); /* 用 DaisyUI 的 primary 颜色做强调 */
      padding-left: 1em;
      color: var(--bc);
      opacity: 0.8;
      background-color: var(--b2);
      padding: 0.5rem 1rem;
      border-radius: 0 0.5rem 0.5rem 0;
    }

    a {
      color: var(--p);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    /* --- 移动端体验增强 --- */
    /* 1. 代码块防溢出与美化 */
    pre {
      background-color: var(--b2) !important;
      border-radius: 0.5rem;
      padding: 1rem;
      overflow-x: auto; /* 核心：移动端横向滚动 */
      -webkit-overflow-scrolling: touch;
    }

    code {
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875em;
    }

    /* 行内代码块的特殊处理 */
    :not(pre) > code {
      background-color: var(--b2);
      padding: 0.2em 0.4em;
      border-radius: 0.25rem;
      color: var(--p);
    }

    /* 2. 表格防溢出 */
    .table-wrapper {
      overflow-x: auto;
      margin-bottom: 1.25em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--b3);
      text-align: left;
    }

    th {
      font-weight: 600;
      background-color: var(--b2);
    }
  `;

  // 注入 Highlight.js 的样式到 Shadow DOM
  connectedCallback() {
    super.connectedCallback();
    this.injectHighlightStyles();
  }

  private injectHighlightStyles() {
    // 动态创建 style 标签包裹 hljs 样式
    const style = document.createElement("style");
    style.textContent = `
      .hljs-light { ${hljsLight} }
      .hljs-dark { ${hljsDark} }
    `;
    this.shadowRoot?.appendChild(style);
  }

  private renderMarkdown(rawMd: string) {
    if (!rawMd) return "";

    const toc: TocItem[] = [];
    // const renderer = new marked.Renderer();

    // // 1. 拦截标题：生成 id 锚点，并推入 TOC 数组
    // renderer.heading = (text, level, raw) => {
    //   // 简单的中英文 ID 生成器
    //   const id = raw.toLowerCase().replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, "-");
    //   toc.push({ id, text, level });
    //   return `<h${level} id="${id}">${text}</h${level}>\n`;
    // };

    // // 2. 拦截表格：外层包裹一个 div 处理移动端滚动
    // renderer.table = (header, body) => {
    //   return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
    // };

    // // 3. 配置 marked
    // marked.setOptions({
    //   renderer,
    //   highlight: (code, lang) => {
    //     const language = hljs.getLanguage(lang) ? lang : "plaintext";
    //     return hljs.highlight(code, { language }).value;
    //   },
    // });

    const htmlContent = marked.parse(rawMd);

    // 解析完成后，通过 CustomEvent 将目录数据抛给外部（例如你的父级页面/侧边栏）
    this.dispatchEvent(
      new CustomEvent("toc-ready", {
        detail: toc,
        bubbles: true,
        composed: true, // 允许事件穿透 Shadow DOM
      }),
    );

    return htmlContent;
  }

  render() {
    return html`
      <div class="markdown-body">
        <div
          class="hljs-light hljs-dark"
          .innerHTML=${this.renderMarkdown(this.content)}
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "md-reader": MdReader;
  }
}
