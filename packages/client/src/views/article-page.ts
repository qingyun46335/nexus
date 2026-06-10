import { html, type PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import axios from "axios";
import { marked, Renderer } from "marked";
import hljs from "highlight.js";
import { getUrlParam } from "../utils/url_util";
import { DaisyUIElement } from "../components/daisy-ui-element";

// ─── Types ───────────────────────────────────────────────────────────────────

type PreviewType = "text" | "image" | "video" | "audio" | "unsupported";

interface Tag {
  id: string;
  name: string;
  views: number;
}

interface ArticleFile {
  id: string;
  suffix: string;
  name: string;
  previewType: PreviewType;
  size: number;
  clientFilePath: string;
  relativePath: string;
  articleId: string;
}

interface ArticleDetail {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  wordCount: number;
  tags: Tag[];
  files: ArticleFile[];
  content: string; // raw markdown (may contain <img>/<video>/<audio> tags)
}

interface AdjacentArticle {
  id: string;
  title: string;
  createdAt: string;
}

interface AdjacentResponse {
  prev: AdjacentArticle | null;
  next: AdjacentArticle | null;
}

interface RecommendedArticle {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  wordCount: number;
  tags: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number; // 1 | 2 | 3
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 300));
}

const API = {
  attachment: (path: string) => `/api/client/assets${path}`
}

// ─── marked renderer ─────────────────────────────────────────────────────────

function buildRenderer(): Renderer {
  const renderer = new Renderer();
  const slugCount: Record<string, number> = {};

  // Headings: inject id for TOC anchors
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const raw = text.replace(/<[^>]*>/g, "");
    const base = slugify(raw);
    slugCount[base] = (slugCount[base] ?? -1) + 1;
    const id = slugCount[base] === 0 ? base : `${base}-${slugCount[base]}`;
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  // Code blocks: highlight.js + copy button + header bar
  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(text, { language }).value;
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : "";
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <iconify-icon icon="ph:code" class="code-icon"></iconify-icon>
        ${langLabel}
        <button class="copy-btn" title="复制代码"
          onclick="(function(btn){
            const code = btn.closest('.code-block-wrapper').querySelector('code');
            navigator.clipboard.writeText(code.textContent).then(()=>{
              btn.querySelector('iconify-icon').setAttribute('icon','ph:check');
              setTimeout(()=>btn.querySelector('iconify-icon').setAttribute('icon','ph:copy'),1500);
            });
          })(this)">
          <iconify-icon icon="ph:copy"></iconify-icon>
        </button>
      </div>
      <pre><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>`;
  };

  // Blockquote: decorative
  renderer.blockquote = ({ text }: { text: string }) => {
    return `<blockquote class="nexus-blockquote">${text}</blockquote>`;
  };

  // Images from markdown syntax ![alt](url): styled with lightbox trigger
  renderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
    const alt = text || title || "";
    const cap = title ? `<figcaption class="prose-img-caption">${title}</figcaption>` : "";
    return `<figure class="prose-figure">
      <img class="prose-img" src="${href}" alt="${alt}"
           loading="lazy" decoding="async"
           data-lightbox="${href}"
           onclick="this.dispatchEvent(new CustomEvent('nexus-lightbox',{bubbles:true,composed:true,detail:{src:'${href}',alt:'${alt}'}}))"/>
      ${cap}
    </figure>`;
  };

  return renderer;
}

// Post-process rendered HTML: style raw <img>, <video>, <audio> HTML tags
// that appear in markdown source as literal HTML
function postProcessHtml(raw: string): string {
  // <img> tags not already wrapped in .prose-figure
  raw = raw.replace(
    /(?<!class="prose-img[^"]*")(<img\b(?![^>]*class="prose-img")[^>]*>)/gi,
    (tag) => {
      // Extract src and alt
      const src = (tag.match(/src="([^"]*)"/) || [])[1] || "";
      const alt = (tag.match(/alt="([^"]*)"/) || [])[1] || "";
      // const newTag = tag.replace(/<img/, '<img class="prose-img" loading="lazy" decoding="async"');
      return `<figure class="prose-figure">
        <img class="prose-img" src="${src}" alt="${alt}" loading="lazy" decoding="async"
             data-lightbox="${src}"
             onclick="this.dispatchEvent(new CustomEvent('nexus-lightbox',{bubbles:true,composed:true,detail:{src:'${src}',alt:'${alt}'}}))"/>
        ${alt ? `<figcaption class="prose-img-caption">${alt}</figcaption>` : ""}
      </figure>`;
    }
  );

  // <video> tags: wrap in styled container
  raw = raw.replace(
    /<video\b([^>]*)>([\s\S]*?)<\/video>/gi,
    (_, attrs, inner) => {
      // Ensure controls attribute
      const hasControls = /controls/.test(attrs);
      return `<div class="prose-video-wrapper">
        <video class="prose-video"${hasControls ? "" : " controls"} ${attrs} playsinline>
          ${inner}
        </video>
      </div>`;
    }
  );

  // <audio> tags: wrap in styled container
  raw = raw.replace(
    /<audio\b([^>]*)>([\s\S]*?)<\/audio>/gi,
    (_, attrs, inner) => {
      const hasControls = /controls/.test(attrs);
      return `<div class="prose-audio-wrapper">
        <iconify-icon icon="ph:waveform" class="prose-audio-icon"></iconify-icon>
        <audio class="prose-audio"${hasControls ? "" : " controls"} ${attrs}>
          ${inner}
        </audio>
      </div>`;
    }
  );

  return raw;
}

function buildHtml(md: string): string {
  marked.setOptions({ renderer: buildRenderer(), breaks: true });
  const raw = marked(md) as string;
  return postProcessHtml(raw);
}

function extractToc(html: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items: TocItem[] = [];
  doc.querySelectorAll("h1, h2, h3").forEach((h) => {
    items.push({
      id: h.id || slugify(h.textContent ?? ""),
      text: h.textContent ?? "",
      level: parseInt(h.tagName[1]),
    });
  });
  return items;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

// ─── File icon map ────────────────────────────────────────────────────────────

const FILE_ICON: Record<string, string> = {
  pdf: "ph:file-pdf",
  "7z": "ph:file-zip",
  zip: "ph:file-zip",
  rar: "ph:file-zip",
  mp4: "ph:file-video",
  mov: "ph:file-video",
  doc: "ph:file-doc",
  docx: "ph:file-doc",
  xls: "ph:file-xls",
  xlsx: "ph:file-xls",
  txt: "ph:file-text",
  mp3: "ph:file-audio",
  wav: "ph:file-audio",
  flac: "ph:file-audio",
};

// ─── Component ────────────────────────────────────────────────────────────────

@customElement("article-page")
export class ArticlePage extends DaisyUIElement {

  // ── Shadow DOM is intentionally disabled so Tailwind/DaisyUI utility classes
  //    from the global stylesheet apply directly. All scoped styles go via
  //    adoptedStyleSheets or inline <style> injected into the light DOM.
  createRenderRoot() { return this; }

  // ── Props ──
  @property({ type: String }) articleId = "daming-ep1-analysis";

  // ── State ──
  @state() private _article: ArticleDetail | null = null;
  @state() private _adjacent: AdjacentResponse | null = null;
  @state() private _recommended: RecommendedArticle[] = [];
  @state() private _loading = true;
  @state() private _error = "";
  @state() private _renderedHtml = "";
  @state() private _toc: TocItem[] = [];
  @state() private _activeTocId = "";
  @state() private _tocCollapsed = false;

  // TOC viewport clipping: fraction [0,1] of TOC visible from bottom
  // and top, driven by article's bounding rect in viewport
  @state() private _tocClipTop = 0;    // px from top to clip
  // @ts-ignore
  @state() private _tocClipBottom = 0; // px from bottom to clip
  @state() private _tocVisible = false;

  @state() private _liked = false;
  @state() private _likeCount = 0;
  @state() private _likeAnimating = false;
  @state() private _isDark = false;
  @state() private _readingProgress = 0;
  @state() private _toastMsg = "";

  // Lightbox
  @state() private _lightboxSrc = "";
  @state() private _lightboxAlt = "";
  @state() private _lightboxOpen = false;

  // ── Private ──
  private _headingObserver: IntersectionObserver | null = null;
  private _scrollRaf = 0;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  private _styleEl: HTMLStyleElement | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();
    this._injectStyles();

    this._isDark = document.documentElement.getAttribute("data-theme") !== "light";
    new MutationObserver(() => {
      this._isDark = document.documentElement.getAttribute("data-theme") !== "light";
    }).observe(document.documentElement, { attributes: true });

    window.addEventListener("scroll", this._onScroll, { passive: true });
    window.addEventListener("resize", this._onScroll, { passive: true });

    // Lightbox event from prose content (bubbles through light DOM)
    this.addEventListener("nexus-lightbox", this._onLightbox as EventListener);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("scroll", this._onScroll);
    window.removeEventListener("resize", this._onScroll);
    this._headingObserver?.disconnect();
    this._styleEl?.remove();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has("_renderedHtml") && this._renderedHtml) {
      this.updateComplete.then(() => {
        this._initHeadingObserver();
        this._onScroll(); // initial TOC position
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scoped styles injected into <head> (light DOM component)
  // ─────────────────────────────────────────────────────────────────────────

  private _injectStyles() {
    if (document.getElementById("nexus-article-styles")) return;
    const s = document.createElement("style");
    s.id = "nexus-article-styles";
    s.textContent = `
/* ── Reading progress ── */
.nexus-reading-progress {
  position: fixed; top: 0; left: 0; height: 2px; z-index: 9999;
  background: linear-gradient(90deg, oklch(var(--p)), oklch(var(--s)));
  transition: width 0.1s linear; pointer-events: none;
}

/* ── Glass card (shared) ── */
.nexus-glass {
  background: oklch(var(--b1) / 0.55);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid oklch(var(--bc) / 0.10);
}
.nexus-glass-heavy {
  background: oklch(var(--b1) / 0.72);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  border: 1px solid oklch(var(--bc) / 0.12);
}

/* ── Prose typography ── */
.prose-nexus {
  color: oklch(var(--bc));
  line-height: 1.9;
  font-size: 1rem;
  word-break: break-word;
}
.prose-nexus h1,.prose-nexus h2,.prose-nexus h3 {
  font-family: 'Noto Serif SC','Source Han Serif CN',serif;
  font-weight: 700; line-height: 1.4;
  margin-top: 2.4em; margin-bottom: 0.8em;
  scroll-margin-top: 5rem;
}
.prose-nexus h1 {
  font-size: 1.55rem;
  border-left: 4px solid oklch(var(--p));
  padding-left: 0.75rem;
}
.prose-nexus h2 {
  font-size: 1.25rem;
  border-left: 3px solid oklch(var(--s));
  padding-left: 0.6rem;
}
.prose-nexus h3 {
  font-size: 1.05rem;
  color: oklch(var(--bc) / 0.75);
  padding-left: 0.4rem;
}
.prose-nexus p { margin-bottom: 1.5em; text-align: justify; }
.prose-nexus strong { font-weight: 700; }
.prose-nexus em { font-style: italic; color: oklch(var(--bc) / 0.8); }
.prose-nexus a {
  color: oklch(var(--p)); text-decoration: underline;
  text-underline-offset: 3px; transition: opacity .15s;
}
.prose-nexus a:hover { opacity: .7; }
.prose-nexus ul,.prose-nexus ol { margin-left: 1.5rem; margin-bottom: 1.5em; }
.prose-nexus li { margin-bottom: 0.45em; }
.prose-nexus hr { border-color: oklch(var(--bc)/0.1); margin: 2em 0; }

/* Table */
.prose-nexus table {
  width: 100%; border-collapse: collapse;
  margin-bottom: 1.8em; font-size: 0.9rem; display: block; overflow-x: auto;
}
.prose-nexus th {
  background: oklch(var(--b2)/0.7); padding: .5rem .75rem;
  font-weight: 600; border-bottom: 2px solid oklch(var(--bc)/0.12);
  white-space: nowrap;
}
.prose-nexus td {
  padding: .45rem .75rem;
  border-bottom: 1px solid oklch(var(--bc)/0.07);
}
.prose-nexus tr:hover td { background: oklch(var(--b2)/0.4); }

/* Blockquote */
.prose-nexus .nexus-blockquote {
  position: relative; margin: 1.8em 0;
  padding: 1.1rem 1.25rem 1.1rem 1.6rem;
  background: oklch(var(--b2)/0.55);
  border-left: 3px solid oklch(var(--a));
  border-radius: 0 .6rem .6rem 0;
  color: oklch(var(--bc)/0.78); font-style: italic;
}
.prose-nexus .nexus-blockquote::before {
  content: '"'; position: absolute; top: -.6rem; left: .8rem;
  font-size: 3.5rem; color: oklch(var(--a)/0.25);
  font-family: Georgia,serif; line-height: 1; pointer-events: none;
}

/* Inline code */
.prose-nexus :not(pre) > code {
  background: oklch(var(--b2)/0.8);
  border: 1px solid oklch(var(--bc)/0.1);
  padding: .15em .4em; border-radius: .3em;
  font-size: .85em; font-family: 'JetBrains Mono','Fira Code',monospace;
  color: oklch(var(--p));
}

/* Code block */
.prose-nexus .code-block-wrapper {
  margin: 1.8em 0; border-radius: .8rem; overflow: hidden;
  border: 1px solid oklch(var(--bc)/0.1);
  box-shadow: 0 4px 24px oklch(var(--bc)/0.08);
}
.prose-nexus .code-block-header {
  display: flex; align-items: center; gap: .4rem;
  padding: .45rem .9rem;
  background: #0d0e17;
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: .72rem; color: rgba(255,255,255,.35);
}
.prose-nexus .code-lang {
  font-family: 'JetBrains Mono',monospace;
  color: rgba(255,255,255,.45); margin-right: auto;
}
.prose-nexus .code-icon { font-size: .85rem; opacity: .4; }
.prose-nexus .copy-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,.3); padding: .15rem .3rem;
  border-radius: .25rem; display: flex; align-items: center;
  transition: color .15s, background .15s;
}
.prose-nexus .copy-btn:hover {
  color: rgba(255,255,255,.85); background: rgba(255,255,255,.08);
}
.prose-nexus pre {
  margin: 0; padding: 1.1rem; overflow-x: auto;
  font-size: .84rem; line-height: 1.75; background: #1a1b26;
}
.prose-nexus code { font-family: 'JetBrains Mono','Fira Code',monospace; }

/* hljs Tokyo Night */
.hljs { background: #1a1b26 !important; color: #c0caf5; }
.hljs-keyword,.hljs-selector-tag { color: #bb9af7; }
.hljs-string,.hljs-attr { color: #9ece6a; }
.hljs-number,.hljs-literal { color: #ff9e64; }
.hljs-comment { color: #565f89; font-style: italic; }
.hljs-built_in,.hljs-type { color: #2ac3de; }
.hljs-function .hljs-title,.hljs-title { color: #7aa2f7; }
.hljs-variable { color: #c0caf5; }
.hljs-params { color: #e0af68; }
.hljs-property { color: #73daca; }
.hljs-punctuation { color: #89ddff; }
.hljs-tag { color: #f7768e; }

/* ── Media inside prose ── */

/* figure + img (both markdown and raw <img>) */
.prose-nexus .prose-figure {
  margin: 2em 0; text-align: center;
}
.prose-nexus .prose-img {
  max-width: 100%; width: 100%; height: auto;
  border-radius: .7rem;
  box-shadow: 0 4px 28px oklch(var(--bc)/0.14);
  cursor: zoom-in;
  transition: transform .2s, box-shadow .2s;
  display: block; margin: 0 auto;
}
.prose-nexus .prose-img:hover {
  transform: scale(1.01);
  box-shadow: 0 8px 40px oklch(var(--bc)/0.22);
}
.prose-nexus .prose-img-caption {
  margin-top: .6rem; font-size: .82rem;
  color: oklch(var(--bc)/0.45); font-style: italic;
}

/* video */
.prose-nexus .prose-video-wrapper {
  margin: 2em 0; border-radius: .7rem; overflow: hidden;
  background: #000;
  box-shadow: 0 4px 28px oklch(var(--bc)/0.18);
}
.prose-nexus .prose-video {
  width: 100%; max-height: 60vh;
  display: block; object-fit: contain;
}

/* audio */
.prose-nexus .prose-audio-wrapper {
  margin: 1.6em 0; display: flex; align-items: center; gap: .75rem;
  padding: .85rem 1.1rem;
  background: oklch(var(--b2)/0.6);
  border: 1px solid oklch(var(--bc)/0.09);
  border-radius: .7rem;
}
.prose-nexus .prose-audio-icon {
  font-size: 1.4rem; color: oklch(var(--p)/0.7); flex-shrink: 0;
}
.prose-nexus .prose-audio {
  flex: 1; min-width: 0; height: 36px;
  accent-color: oklch(var(--p));
}

/* ── TOC ── */
.nexus-toc-panel {
  width: 15rem; flex-shrink: 0;
  /* Position is driven inline by JS */
  position: fixed;
  overflow: hidden;    /* clip top/bottom */
  pointer-events: none; /* panel itself transparent, children get events */
  transition: none;
}
.nexus-toc-inner {
  pointer-events: auto;
  border-radius: .75rem;
  overflow: hidden;
}
.nexus-toc-item {
  display: block; width: 100%; text-align: left;
  padding: .35rem 1rem; font-size: .72rem; line-height: 1.45;
  border-left: 2px solid transparent;
  color: oklch(var(--bc)/0.45);
  background: none; border-top: none; border-right: none; border-bottom: none;
  cursor: pointer; transition: color .18s, border-color .18s, background .18s;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.nexus-toc-item:hover { color: oklch(var(--bc)/0.85); }
.nexus-toc-item.active {
  color: oklch(var(--p)); border-left-color: oklch(var(--p));
  background: oklch(var(--p)/0.07);
}
.nexus-toc-item.level-1 { padding-left: 1rem; font-weight: 600; }
.nexus-toc-item.level-2 { padding-left: 1.6rem; }
.nexus-toc-item.level-3 { padding-left: 2.2rem; font-size: .68rem; color: oklch(var(--bc)/0.35); }

/* ── Attachment cards ── */
.nexus-attach-card {
  display: flex; align-items: center; gap: .75rem;
  padding: .7rem .9rem;
  border-radius: .65rem; border: 1px solid oklch(var(--bc)/0.09);
  background: oklch(var(--b2)/0.45);
  transition: border-color .15s, background .15s, transform .15s;
}
.nexus-attach-card:hover {
  border-color: oklch(var(--p)/0.35);
  background: oklch(var(--b2)/0.7);
  transform: translateY(-1px);
}

/* ── Like heartbeat ── */
@keyframes nexus-heartbeat {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.38); }
  60%  { transform: scale(.95); }
  100% { transform: scale(1); }
}
.nexus-liked-beat { animation: nexus-heartbeat .45s ease; }

/* ── Lightbox ── */
.nexus-lightbox-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.88); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; cursor: zoom-out;
  animation: nexus-lb-in .2s ease;
}
@keyframes nexus-lb-in {
  from { opacity: 0; } to { opacity: 1; }
}
.nexus-lightbox-img {
  max-width: 92vw; max-height: 90vh;
  border-radius: .5rem; object-fit: contain;
  box-shadow: 0 20px 80px rgba(0,0,0,.6);
  cursor: default;
}
.nexus-lightbox-caption {
  position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
  color: rgba(255,255,255,.55); font-size: .8rem; max-width: 60ch;
  text-align: center; font-style: italic;
}
.nexus-lightbox-close {
  position: absolute; top: 1rem; right: 1rem;
  background: rgba(255,255,255,.12); border: none; cursor: pointer;
  color: #fff; border-radius: 9999px; width: 2.2rem; height: 2.2rem;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; transition: background .15s;
}
.nexus-lightbox-close:hover { background: rgba(255,255,255,.25); }

/* ── Toast ── */
.nexus-toast {
  position: fixed; bottom: 1.75rem; left: 50%; transform: translateX(-50%);
  z-index: 9998; padding: .45rem 1.1rem;
  background: oklch(var(--bc)); color: oklch(var(--b1));
  border-radius: 9999px; font-size: .78rem; font-family: monospace;
  box-shadow: 0 4px 20px rgba(0,0,0,.2);
  animation: nexus-toast-in .22s ease;
  white-space: nowrap;
}
@keyframes nexus-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── Skeleton shimmer ── */
.nexus-skeleton {
  border-radius: .35rem;
  background: linear-gradient(
    90deg,
    oklch(var(--b2)) 25%,
    oklch(var(--b3)) 50%,
    oklch(var(--b2)) 75%
  );
  background-size: 200% 100%;
  animation: nexus-shimmer 1.4s infinite;
}
@keyframes nexus-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Adjacent / recommended cards ── */
.nexus-nav-card {
  display: flex; flex-direction: column; gap: .35rem;
  padding: 1rem 1.1rem; border-radius: .75rem;
  border: 1px solid oklch(var(--bc)/0.09);
  background: oklch(var(--b1)/0.5);
  backdrop-filter: blur(12px);
  transition: border-color .18s, background .18s;
  text-decoration: none;
}
.nexus-nav-card:hover {
  border-color: oklch(var(--p)/0.3);
  background: oklch(var(--b1)/0.7);
}

/* ── Section label ── */
.nexus-section-label {
  font-family: monospace; font-size: .72rem; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase;
  color: oklch(var(--bc)/0.35);
  display: flex; align-items: center; gap: .5rem;
  margin-bottom: 1.25rem;
}
    `;
    document.head.appendChild(s);
    this._styleEl = s;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────────────────────────────────

  protected firstUpdated() {
    const res = getUrlParam("article")
    if (res && res.exists && res.value) {
      this.articleId = res.value
    }
    this._fetchAll();
  }

  private async _fetchAll() {
    this._loading = true;
    try {
      // Production:
      const [artRes, adjRes, recRes] = await Promise.all([
        axios.get(`/api/client/article/getArticleById?id=${this.articleId}`),
        axios.get(`/api/client/article/adjacent?id=${this.articleId}`),
        axios.get(`/api/client/article/recommended?limit=4`),
      ]);
      this._article = artRes.data.value;
      this._adjacent = adjRes.data.value;
      this._recommended = recRes.data.value;
      this._likeCount = this._article ? this._article.likes : 0;
      this._liked = localStorage.getItem(`like:${this.articleId}`) === "1";
      if (this._liked) this._likeCount++;

      this._renderedHtml = buildHtml(this._article ? this._article.content : "");
      this._toc = extractToc(this._renderedHtml);
    } catch (e) {
      console.log(e)
      this._error = "文章加载失败，请稍后重试";
    } finally {
      this._loading = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOC scroll tracking
  // ─────────────────────────────────────────────────────────────────────────

  private _onScroll = () => {
    cancelAnimationFrame(this._scrollRaf);
    this._scrollRaf = requestAnimationFrame(() => {
      // Reading progress
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      this._readingProgress = total > 0 ? (el.scrollTop / total) * 100 : 0;

      // TOC clip driven by article bounding rect
      const articleEl = this.querySelector(".nexus-article-body");
      if (!articleEl) return;

      const rect = articleEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const HEADER = 56; // sticky header height

      // How much of the article is visible in viewport (below header)
      const visTop = Math.max(rect.top, HEADER);
      const visBot = Math.min(rect.bottom, vh);
      const visibleHeight = Math.max(0, visBot - visTop);

      this._tocVisible = visibleHeight > 0;

      if (!this._tocVisible) {
        this._tocClipTop = 0;
        this._tocClipBottom = 0;
        return;
      }

      // TOC panel height (measured from DOM if available)
      // const tocPanel = this.querySelector(".nexus-toc-panel") as HTMLElement | null;
      const tocInner = this.querySelector(".nexus-toc-inner") as HTMLElement | null;
      const tocH = tocInner ? tocInner.offsetHeight : 300;

      // The TOC always wants to sit at `top = HEADER` in fixed coords.
      // We clip it from the top if the article hasn't reached the header yet,
      // and from the bottom if the article bottom is above the fold.

      // Clip from top: how far above HEADER is the article top?
      // If rect.top > HEADER → article hasn't crossed header → clip top by (rect.top - HEADER)
      const rawClipTop = Math.max(0, rect.top - HEADER);
      // Clip from bottom: if article bottom is within viewport, TOC should end there
      const rawClipBottom = Math.max(0, tocH - visibleHeight - Math.max(0, HEADER - rect.top));
      // Clamp
      const clipTop = Math.min(rawClipTop, tocH);
      const clipBottom = Math.max(0, Math.min(rawClipBottom, tocH - clipTop));

      this._tocClipTop = clipTop;
      this._tocClipBottom = clipBottom;
    });
  };

  private _initHeadingObserver() {
    this._headingObserver?.disconnect();
    const contentEl = this.querySelector(".prose-nexus");
    if (!contentEl) return;
    const headings = contentEl.querySelectorAll("h1, h2, h3");
    if (!headings.length) return;

    this._headingObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) this._activeTocId = visible[0].target.id;
      },
      { rootMargin: "-56px 0px -55% 0px", threshold: 0 }
    );
    headings.forEach((h) => this._headingObserver!.observe(h));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  private _toggleTheme() {
    const next = this._isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    this._isDark = !this._isDark;
  }

  private _toggleLike() {
    this._liked = !this._liked;
    this._likeCount += this._liked ? 1 : -1;
    localStorage.setItem(`like:${this.articleId}`, this._liked ? "1" : "0");
    this._likeAnimating = true;
    setTimeout(() => (this._likeAnimating = false), 500);
  }

  private _share() {
    navigator.clipboard.writeText(location.href).then(() => this._toast("链接已复制到剪贴板 ✓"));
  }

  private _toast(msg: string) {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastMsg = msg;
    this._toastTimer = setTimeout(() => (this._toastMsg = ""), 2500);
  }

  private _scrollToId(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private _onLightbox = (e: CustomEvent<{ src: string; alt: string }>) => {
    this._lightboxSrc = e.detail.src;
    this._lightboxAlt = e.detail.alt;
    this._lightboxOpen = true;
    document.body.style.overflow = "hidden";
  };

  private _closeLightbox() {
    this._lightboxOpen = false;
    document.body.style.overflow = "";
  }

  private _downloadFile(file: ArticleFile) {
    // Production: redirect to a signed download URL from backend
    // axios.get(`/api/files/${file.uuid}/download`).then(r => window.open(r.data.url))
    window.open(file.clientFilePath, "_blank");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Navbar
  // ─────────────────────────────────────────────────────────────────────────

  private _renderNavbar() {
    return html`
      <header class="sticky top-0 z-50 flex items-center gap-3 px-4 lg:px-8 h-14
                     nexus-glass-heavy border-b transition-colors duration-300">
        <a href="/pages/home" class="font-mono font-bold text-base tracking-widest
                           text-base-content mr-2 flex-shrink-0 hover:text-primary transition-colors">
          NEXUS-BLOG
        </a>
        <div class="flex-1">
          <a href="/pages/about" class="btn btn-outline btn-xs">About</a>
        </div>
        <button @click="${this._toggleTheme}"
                class="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-base-content">
          ${this._isDark
        ? html`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path stroke-linecap="round"
                      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
                         M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>`
        : html`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21
                         a9.003 9.003 0 008.354-5.646z"/>
              </svg>`}
        </button>
      </header>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Footer
  // ─────────────────────────────────────────────────────────────────────────

  private _renderFooter() {
    return html`
      <footer class="mt-16 border-t border-base-content/6 nexus-glass">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                    py-5 flex flex-col sm:flex-row items-center justify-between
                    gap-3 font-mono text-[11px] text-base-content/25">
          <span>© ${new Date().getFullYear()} NEXUS</span>
          <span class="hidden sm:inline text-base-content/12">·</span>
          <span>Powered by Cloudflare Workers &amp; Lit</span>
          <span class="hidden sm:inline text-base-content/12">·</span>
          <span class="flex items-center gap-1 hover:text-warning transition-colors">
            <!-- <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20
                       C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56
                       15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a
                       9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
            </svg>
            RSS -->
          </span>
        </div>
      </footer>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Skeleton
  // ─────────────────────────────────────────────────────────────────────────

  private _renderSkeleton() {
    return html`
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="nexus-skeleton w-3/4 mb-4" style="height:2.2rem"></div>
        <div class="nexus-skeleton w-1/3 mb-2" style="height:1rem"></div>
        <div class="nexus-skeleton w-1/4 mb-10" style="height:1rem"></div>
        <div class="flex gap-10">
          <div class="flex-1 space-y-4">
            ${[100, 90, 95, 80, 85, 92, 78, 88].map(w => html`
              <div class="nexus-skeleton" style="height:.95rem;width:${w}%"></div>`)}
          </div>
          <div class="hidden lg:block w-60 space-y-3">
            ${[70, 85, 60, 75, 55].map(w => html`
              <div class="nexus-skeleton" style="height:.7rem;width:${w}%"></div>`)}
          </div>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Article header (full-width)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderArticleHeader(a: ArticleDetail) {
    return html`
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-7">

        <!-- Title -->
        <h1 class="text-2xl sm:text-3xl lg:text-[2.1rem] font-bold leading-tight
                   text-base-content mb-4"
            style="font-family:'Noto Serif SC','Source Han Serif CN',serif;">
          ${a.title}
        </h1>

        <!-- Meta -->
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2
                    text-[.8rem] text-base-content/45 font-mono mb-4">
          <span class="flex items-center gap-1">
            <iconify-icon icon="ph:calendar-blank"></iconify-icon>
            ${formatDate(a.createdAt)}
          </span>
          <span class="opacity-30">·</span>
          <span class="flex items-center gap-1">
            <iconify-icon icon="ph:clock"></iconify-icon>
            ${readingTime(a.wordCount)} min
          </span>
          <span class="opacity-30">·</span>
          <span class="flex items-center gap-1">
            <iconify-icon icon="ph:text-aa"></iconify-icon>
            ${a.wordCount.toLocaleString()} 字
          </span>
          <span class="opacity-30">·</span>
          <span class="flex items-center gap-1">
            <iconify-icon icon="ph:eye"></iconify-icon>
            ${a.views.toLocaleString()}
          </span>
          ${a.updatedAt !== a.createdAt ? html`
            <span class="opacity-30">·</span>
            <span class="flex items-center gap-1 opacity-60">
              <iconify-icon icon="ph:arrows-clockwise"></iconify-icon>
              更新 ${formatDate(a.updatedAt)}
            </span>` : nothing}
        </div>

        <!-- Tags -->
        <div class="flex flex-wrap gap-2 mb-5">
          ${a.tags.map(t => html`
            <span 
               class="badge badge-outline text-[.72rem] font-mono
                      hover:badge-primary transition-colors">
              #${t.name}
            </span>`)}
        </div>

        <!-- Description -->
        <p class="text-base-content/55 text-[.9rem] leading-relaxed
                  border-l-2 border-base-content/15 pl-4 italic
                  max-w-2xl">
          ${a.description}
        </p>
      </div>

      <!-- Separator -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="border-t border-base-content/8 mb-0"></div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: TOC panel (fixed, clip-driven)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderToc() {
    if (this._toc.length === 0) return nothing;

    // Right-side position: align with the right edge of the content area
    // We use right: calc((100vw - min(72rem, 100vw)) / 2 + 1rem)
    // but simpler: just right:1.5rem for now, matches most layouts
    const HEADER = 56;
    // const topPx = HEADER + this._tocClipTop; // clip from top via padding
    // const clipH = this._tocClipTop + this._tocClipBottom;
    // visible height of TOC controlled by clipping container
    // We don't shrink the panel itself, we translate it so the visible
    // "window" always aligns to the top-right of the article
    const translateY = -this._tocClipTop;

    return html`
      <div class="nexus-toc-panel hidden lg:block"
           style="
             top: ${HEADER}px;
             right: max(1.5rem, calc((100vw - 72rem) / 2));
             height: calc(100vh - ${HEADER}px);
             overflow: hidden;
             opacity: ${this._tocVisible ? 1 : 0};
             transition: opacity .25s ease;
             pointer-events: ${this._tocVisible ? 'auto' : 'none'};
           ">

        <!-- Sliding inner panel -->
        <div style="transform: translateY(${translateY}px); transition: transform .12s linear;">
          <div class="nexus-toc-inner nexus-glass" style="max-height: calc(100vh - ${HEADER + 24}px);">

            <!-- Header -->
            <button @click="${() => (this._tocCollapsed = !this._tocCollapsed)}"
                    class="w-full flex items-center justify-between px-4 py-3
                           text-[.72rem] font-mono text-base-content/40
                           hover:text-base-content/75 transition-colors">
              <span class="flex items-center gap-1.5">
                <iconify-icon icon="ph:list-bullets"></iconify-icon>
                目录
                <span class="opacity-50">(${this._toc.length})</span>
              </span>
              <iconify-icon icon="${this._tocCollapsed ? 'ph:caret-down' : 'ph:caret-up'}">
              </iconify-icon>
            </button>

            ${this._tocCollapsed ? nothing : html`
              <div class="border-t border-base-content/6 pb-2
                          overflow-y-auto" style="max-height:70vh">
                ${this._toc.map(item => html`
                  <button @click="${() => this._scrollToId(item.id)}"
                          class="nexus-toc-item level-${item.level}
                                 ${this._activeTocId === item.id ? 'active' : ''}">
                    ${item.text}
                  </button>`)}
              </div>`}
          </div>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Article body + TOC (split zone)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderArticleZone() {
    return html`
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <!-- Right margin reserved for fixed TOC on lg screens -->
        <div class="lg:mr-72">
          <article class="nexus-article-body prose-nexus">
            ${unsafeHTML(this._renderedHtml)}
          </article>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Attachments (full-width glass card)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderAttachments(files: ArticleFile[]) {
    if (!files.length) return nothing;

    const images = files.filter(f => f.previewType === "image");
    const audios = files.filter(f => f.previewType === "audio");
    const videos = files.filter(f => f.previewType === "video");
    const others = files.filter(f => f.previewType === "text" || f.previewType === "unsupported");

    return html`
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div class="nexus-glass rounded-2xl p-6">

          <div class="nexus-section-label">
            <iconify-icon icon="ph:paperclip"></iconify-icon>
            附件
            <span class="badge badge-xs badge-ghost font-normal">${files.length}</span>
          </div>

          <!-- Image thumbnails -->
          ${images.length ? html`
            <div class="mb-6">
              <p class="text-[.72rem] text-base-content/35 font-mono mb-3 flex items-center gap-1">
                <iconify-icon icon="ph:image"></iconify-icon> 图片预览
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                ${images.map(f => html`
                  <div class="group relative aspect-video bg-base-200/60 rounded-xl
                              overflow-hidden border border-base-content/8
                              hover:border-primary/30 transition-colors cursor-pointer"
                       @click="${() => {
        this._lightboxSrc = API.attachment("/" + f.previewType + f.clientFilePath);
        this._lightboxAlt = f.name;
        this._lightboxOpen = true;
        document.body.style.overflow = 'hidden';
      }}">
                    <img src="${API.attachment("/" + f.previewType + f.clientFilePath)}" alt="${f.name}"
                         class="w-full h-full object-cover transition-transform duration-300
                                group-hover:scale-105"
                         loading="lazy"/>
                    <div class="absolute inset-0 bg-base-100/0 group-hover:bg-base-100/35
                                transition-colors flex items-end">
                      <p class="w-full px-2 py-1 text-[.65rem] truncate
                                bg-base-100/75 backdrop-blur-sm text-base-content/65
                                translate-y-full group-hover:translate-y-0 transition-transform">
                        ${f.name}
                      </p>
                    </div>
                    <div class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100
                                transition-opacity">
                      <span class="bg-base-100/80 backdrop-blur-sm rounded-full p-1 flex">
                        <iconify-icon icon="ph:magnifying-glass-plus" class="text-sm"></iconify-icon>
                      </span>
                    </div>
                  </div>`)}
              </div>
            </div>` : nothing}

          <!-- Audio -->
          ${audios.length ? html`
            <div class="mb-6 space-y-2">
              <p class="text-[.72rem] text-base-content/35 font-mono mb-3 flex items-center gap-1">
                <iconify-icon icon="ph:music-note"></iconify-icon> 音频
              </p>
              ${audios.map(f => html`
                <div class="nexus-attach-card">
                  <div class="w-9 h-9 rounded-lg bg-primary/12 flex items-center
                              justify-center text-primary flex-shrink-0">
                    <iconify-icon icon="ph:waveform"></iconify-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-base-content truncate">${f.name}</p>
                    <p class="text-[.72rem] text-base-content/40 font-mono">${formatSize(f.size)}</p>
                  </div>
                  <audio controls class="h-8" style="width:180px;min-width:0" preload="none"
                         src="${f.clientFilePath}"></audio>
                  <button @click="${() => this._downloadFile(f)}"
                          class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-primary"
                          title="下载">
                    <iconify-icon icon="ph:download-simple"></iconify-icon>
                  </button>
                </div>`)}
            </div>` : nothing}

          <!-- Other files (text / unsupported / video as download) -->
          ${(others.length + videos.length) ? html`
            <div class="space-y-2">
              <p class="text-[.72rem] text-base-content/35 font-mono mb-3 flex items-center gap-1">
                <iconify-icon icon="ph:files"></iconify-icon> 文件
              </p>
              ${[...videos, ...others].map(f => html`
                <div class="nexus-attach-card">
                  <div class="w-9 h-9 rounded-lg bg-base-200 flex items-center
                              justify-center text-base-content/45 flex-shrink-0">
                    <iconify-icon icon="${FILE_ICON[f.suffix] ?? 'ph:file'}" class="text-lg">
                    </iconify-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-base-content truncate">${f.name}</p>
                    <p class="text-[.72rem] text-base-content/40 font-mono">
                      ${f.suffix.toUpperCase()} · ${formatSize(f.size)}
                    </p>
                  </div>
                  <button @click="${() => this._downloadFile(f)}"
                          class="btn btn-ghost btn-sm btn-circle text-base-content/40
                                 hover:text-primary flex-shrink-0" title="下载">
                    <iconify-icon icon="ph:download-simple"></iconify-icon>
                  </button>
                </div>`)}
            </div>` : nothing}

        </div>
      </section>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Actions — like / share (full-width)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderActions() {
    return html`
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div class="nexus-glass rounded-2xl px-6 py-8 text-center">
          <p class="text-base-content/40 text-sm italic mb-6"
             style="font-family:'Noto Serif SC',serif;">
            如果这篇文章对你有帮助，欢迎分享给更多人 —— 这对我很重要 ✦
          </p>
          <div class="flex items-center justify-center gap-6">

            <!-- Like -->
            <button @click="${this._toggleLike}"
                    class="flex flex-col items-center gap-1.5 group select-none">
              <div class="w-12 h-12 rounded-full border-2 transition-all duration-200
                          flex items-center justify-center text-xl
                          ${this._liked
        ? 'border-error bg-error/10 text-error'
        : 'border-base-content/20 text-base-content/30 group-hover:border-error/50 group-hover:text-error/60'}
                          ${this._likeAnimating ? 'nexus-liked-beat' : ''}">
                <iconify-icon icon="${this._liked ? 'ph:heart-fill' : 'ph:heart'}"></iconify-icon>
              </div>
              <span class="text-xs font-mono text-base-content/40">${this._likeCount}</span>
            </button>

            <!-- Share -->
            <button @click="${this._share}"
                    class="flex flex-col items-center gap-1.5 group select-none">
              <div class="w-12 h-12 rounded-full border-2 border-base-content/20
                          text-base-content/30 group-hover:border-primary/50
                          group-hover:text-primary/60 transition-all duration-200
                          flex items-center justify-center text-xl">
                <iconify-icon icon="ph:share-network"></iconify-icon>
              </div>
              <span class="text-xs font-mono text-base-content/40">分享</span>
            </button>

          </div>
        </div>
      </section>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Adjacent + Recommended (full-width)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderNavigation(adj: AdjacentResponse, recs: RecommendedArticle[]) {
    return html`
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div class="nexus-glass rounded-2xl p-6">

          <!-- Prev / Next -->
          <div class="nexus-section-label">
            <iconify-icon icon="ph:arrows-left-right"></iconify-icon>
            前后篇
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

            <!-- Prev -->
            ${adj.prev
        ? html`<a href="/pages/article?article=${adj.prev.id}" class="nexus-nav-card">
                  <span class="text-[.7rem] font-mono text-base-content/30 flex items-center gap-1">
                    <iconify-icon icon="ph:arrow-left"></iconify-icon> 上一篇
                  </span>
                  <span class="text-sm font-medium text-base-content/80 line-clamp-2
                               group-hover:text-primary transition-colors">
                    ${adj.prev.title}
                  </span>
                  <span class="text-[.7rem] text-base-content/30 font-mono">
                    ${formatDate(adj.prev.createdAt)}
                  </span>
                </a>`
        : html`<div class="nexus-nav-card opacity-40 cursor-default">
                  <span class="text-[.7rem] font-mono text-base-content/30 flex items-center gap-1">
                    <iconify-icon icon="ph:arrow-left"></iconify-icon> 上一篇
                  </span>
                  <span class="text-sm text-base-content/40 italic">已是第一篇</span>
                </div>`}

            <!-- Next -->
            ${adj.next
        ? html`<a href="/pages/article?article=${adj.next.id}" class="nexus-nav-card sm:items-end">
                  <span class="text-[.7rem] font-mono text-base-content/30 flex items-center gap-1 sm:justify-end">
                    下一篇 <iconify-icon icon="ph:arrow-right"></iconify-icon>
                  </span>
                  <span class="text-sm font-medium text-base-content/80 line-clamp-2
                               sm:text-right group-hover:text-primary transition-colors">
                    ${adj.next.title}
                  </span>
                  <span class="text-[.7rem] text-base-content/30 font-mono sm:text-right">
                    ${formatDate(adj.next.createdAt)}
                  </span>
                </a>`
        : html`<div class="nexus-nav-card sm:items-end opacity-40 cursor-default">
                  <span class="text-[.7rem] font-mono text-base-content/30 flex items-center gap-1 sm:justify-end">
                    下一篇 <iconify-icon icon="ph:arrow-right"></iconify-icon>
                  </span>
                  <span class="text-sm text-base-content/40 italic sm:text-right">已是最新篇</span>
                </div>`}
          </div>

          <!-- Recommended -->
          ${recs.length ? html`
            <div class="nexus-section-label">
              <iconify-icon icon="ph:sparkle"></iconify-icon>
              你可能也喜欢
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${recs.map(r => html`
                <a href="/pages/article?article=${r.id}" class="nexus-nav-card group">
                  <h4 class="text-sm font-semibold text-base-content/80 line-clamp-2
                             group-hover:text-primary transition-colors">
                    ${r.title}
                  </h4>
                  <p class="text-[.78rem] text-base-content/45 line-clamp-2 leading-relaxed">
                    ${r.description}
                  </p>
                  <div class="flex items-center gap-3 mt-1 text-[.7rem] font-mono text-base-content/30">
                    <span>${formatDate(r.createdAt)}</span>
                    <span>·</span>
                    <span>${readingTime(r.wordCount)} min</span>
                    ${JSON.parse(r.tags)[0]
            ? html`<span class="ml-auto badge badge-outline badge-xs">#${JSON.parse(r.tags)[0].name}</span>`
            : nothing}
                  </div>
                </a>`)}
            </div>` : nothing}

        </div>
      </section>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Comment placeholder (full-width)
  // ─────────────────────────────────────────────────────────────────────────

  private _renderComments() {
    return html`
      <section class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6" id="comments">
        <!-- 评论区 reserved -->
      </section>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Lightbox
  // ─────────────────────────────────────────────────────────────────────────

  private _renderLightbox() {
    if (!this._lightboxOpen) return nothing;
    return html`
      <div class="nexus-lightbox-overlay"
           @click="${this._closeLightbox}"
           @keydown="${(e: KeyboardEvent) => e.key === 'Escape' && this._closeLightbox()}">
        <img class="nexus-lightbox-img"
             src="${this._lightboxSrc}"
             alt="${this._lightboxAlt}"
             @click="${(e: Event) => e.stopPropagation()}"/>
        ${this._lightboxAlt
        ? html`<p class="nexus-lightbox-caption">${this._lightboxAlt}</p>` : nothing}
        <button class="nexus-lightbox-close" @click="${this._closeLightbox}" title="关闭">
          <iconify-icon icon="ph:x"></iconify-icon>
        </button>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  render() {
    return html`
      <!-- Progress bar -->
      <div class="nexus-reading-progress" style="width:${this._readingProgress}%"></div>

      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-image: url('/../../../public/Image_00_02_00.png');
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        z-index: -1; /* 确保在内容后面 */
      "></div>

      ${this._renderNavbar()}

      <main class="min-h-screen">

        ${this._loading
        ? this._renderSkeleton()
        : this._error
          ? html`
              <div class="max-w-2xl mx-auto px-4 py-24 text-center">
                <iconify-icon icon="ph:warning-circle"
                              class="text-5xl text-error/50 mb-4"></iconify-icon>
                <p class="text-base-content/50 text-sm">${this._error}</p>
              </div>`
          : this._article
            ? html`
              ${this._renderArticleHeader(this._article)}
              ${this._renderArticleZone()}
              ${this._renderToc()}
              ${this._renderAttachments(this._article.files)}
              ${this._renderActions()}
              ${this._adjacent
                ? this._renderNavigation(this._adjacent, this._recommended)
                : nothing}
              ${this._renderComments()}
            `
            : nothing}

      </main>

      ${this._renderFooter()}

      <!-- Lightbox -->
      ${this._renderLightbox()}

      <!-- Toast -->
      ${this._toastMsg
        ? html`<div class="nexus-toast">${this._toastMsg}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "article-page": ArticlePage;
  }
}