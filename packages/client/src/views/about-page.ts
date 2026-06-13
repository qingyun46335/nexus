import { html, css, } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import axios from 'axios';
import { DaisyUIElement } from '../components/daisy-ui-element';
import { styleMap } from 'lit/directives/style-map.js';

interface FriendLink {
  id: number;
  name: string;        // 站名
  url: string;         // 链接
  avatar: string;      // 头像/favicon URL
  description: string; // 一句话介绍
  author: string;      // 作者名
}

/**
 * about-page
 *
 * 后端接口约定：
 *   GET /app/friends
 *   Response: { data: FriendLink[] }
 *
 * Waline 后端约定：
 *   Hono 路由挂载 Waline 兼容接口于 /api/comment
 *   （@waline/vercel 或自定义兼容层均可，serverURL 传入对应地址）
 *
 * 主题同步：
 *   监听 <html data-theme="..."> 变化，同步写入 #waline-container
 *   Waline dark 模式通过 CSS class ".dark" 驱动
 */
@customElement('about-page')
export class AboutPage extends DaisyUIElement {

  // ─── Waline 不放进 shadow DOM，挂到 light DOM 外部容器 ───────────────────
  // 原因：Waline 用全局样式注入，shadow DOM 会隔离 CSS 导致样式失效
  // 方案：组件渲染一个占位 <div id="waline-slot">，
  //       firstUpdated 里把真实容器 portal 到 <body> 内，定位跟随占位符
  //       ——简化方案：直接在 connectedCallback 挂到 light DOM 的 #waline-portal

  @state() private isDarkMode = false;
  @state() private friends: FriendLink[] = [];
  @state() private friendsLoading = true;
  @state() private friendsError = false;

  // waline 实例销毁函数
  private _walineDestroy: (() => void) | null = null;
  // MutationObserver 监听主题变化
  private _themeObserver: MutationObserver | null = null;
  // waline 挂载容器（light DOM）
  private _walineContainer: HTMLElement | null = null;

  // ── Static styles（shadow DOM 内部，仅控制 host 布局和自定义部分）────────
  static defaultStyles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: transparent;
    }

    /* ── 寄语区 ─────────────────────────────────────────────── */
    .bio-section {
      max-width: 48rem;
      margin: 0 auto;
      padding: 3.5rem 1.5rem 2.5rem;
    }

    .bio-label {
      font-family: monospace;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--fallback-bc, oklch(var(--bc)/0.3));
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .bio-label::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--fallback-bc, oklch(var(--bc)/0.1));
    }

    .bio-prompt {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--fallback-su, oklch(var(--su)/0.7));
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .bio-prompt .cursor {
      display: inline-block;
      width: 0.5rem;
      height: 1em;
      background: currentColor;
      animation: blink 1.1s step-end infinite;
      vertical-align: text-bottom;
      margin-left: 2px;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }

    .bio-body {
      font-family: monospace;
      font-size: 0.9rem;
      line-height: 1.9;
      color: var(--fallback-bc, oklch(var(--bc)/0.8));
      white-space: pre-wrap;
    }

    .bio-body .comment {
      color: var(--fallback-bc, oklch(var(--bc)/0.3));
      font-style: normal;
    }

    .bio-body .highlight {
      color: var(--fallback-p, oklch(var(--p)/1));
    }

    .bio-body .accent {
      color: var(--fallback-s, oklch(var(--s)/0.9));
    }

    /* ── 友链区 ─────────────────────────────────────────────── */
    .friends-section {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0 1.5rem 3rem;
    }

    .section-header {
      font-family: monospace;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--fallback-bc, oklch(var(--bc)/0.3));
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-header::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--fallback-bc, oklch(var(--bc)/0.1));
    }

    .friends-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.875rem;
    }

    @media (max-width: 480px) {
      .friends-grid {
        grid-template-columns: 1fr;
      }
    }

    .friend-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.08));
      background: var(--fallback-b1, oklch(var(--b1)/0.5));
      backdrop-filter: blur(8px);
      text-decoration: none;
      transition: border-color 0.2s, background 0.2s, transform 0.2s;
      cursor: pointer;
    }

    .friend-card:hover {
      border-color: var(--fallback-p, oklch(var(--p)/0.3));
      background: var(--fallback-b1, oklch(var(--b1)/0.8));
      transform: translateY(-2px);
    }

    .friend-avatar {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.375rem;
      object-fit: cover;
      flex-shrink: 0;
      background: var(--fallback-bc, oklch(var(--bc)/0.05));
      border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
    }

    .friend-avatar-fallback {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.375rem;
      flex-shrink: 0;
      background: var(--fallback-b2, oklch(var(--b2)/1));
      border: 1px solid var(--fallback-bc, oklch(var(--bc)/0.1));
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: bold;
      color: var(--fallback-bc, oklch(var(--bc)/0.4));
    }

    .friend-info {
      flex: 1;
      min-width: 0;
    }

    .friend-name {
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--fallback-bc, oklch(var(--bc)/0.9));
      margin-bottom: 0.1rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .friend-author {
      font-family: monospace;
      font-size: 0.65rem;
      color: var(--fallback-bc, oklch(var(--bc)/0.35));
      margin-bottom: 0.3rem;
    }

    .friend-desc {
      font-family: monospace;
      font-size: 0.7rem;
      color: var(--fallback-bc, oklch(var(--bc)/0.5));
      line-height: 1.5;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .friend-arrow {
      font-size: 0.65rem;
      color: var(--fallback-bc, oklch(var(--bc)/0.2));
      flex-shrink: 0;
      margin-top: 0.15rem;
      transition: color 0.2s, transform 0.2s;
    }

    .friend-card:hover .friend-arrow {
      color: var(--fallback-p, oklch(var(--p)/0.7));
      transform: translateX(2px);
    }

    /* ── Loading / Error 状态 ───────────────────────────────── */
    .state-box {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc)/0.3));
      padding: 2rem 0;
      text-align: center;
      letter-spacing: 0.05em;
    }

    .state-box.error {
      color: var(--fallback-er, oklch(var(--er)/0.6));
    }

    /* ── 评论区占位 slot ─────────────────────────────────────── */
    .comment-section {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0 1.5rem 4rem;
    }

    .comment-placeholder {
      min-height: 200px;
    }

    /* ── 分隔线 ──────────────────────────────────────────────── */
    .divider-line {
      max-width: 56rem;
      margin: 0 auto 2.5rem;
      padding: 0 1.5rem;
    }

    .divider-line hr {
      border: none;
      border-top: 1px solid var(--fallback-bc, oklch(var(--bc)/0.06));
    }
  `;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private loadingLightOrDark() {
    const dark = window.localStorage.getItem("data-theme")
    if (dark && dark === "dark") {
      document.documentElement.setAttribute("data-theme", "dark")
    } else {
      document.documentElement.setAttribute("data-theme", "light")
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadingLightOrDark()

    // 读取当前主题
    this.isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

    // 监听主题切换
    this._themeObserver = new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark !== this.isDarkMode) {
        this.isDarkMode = dark;
        this._syncWalineTheme(dark);
      }
    });
    this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 拉取友链数据
    this._fetchFriends();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._themeObserver?.disconnect();
    this._walineDestroy?.();
    // 移除 light DOM 中的 waline 容器
    this._walineContainer?.remove();
  }

  firstUpdated() {
    this._initWaline();
  }

  // ── 数据获取 ────────────────────────────────────────────────────────────────

  private async _fetchFriends() {
    try {
      const res = await axios.get<{ data: FriendLink[] }>('/app/friends');
      this.friends = res.data.data;
    } catch {
      this.friendsError = true;
    } finally {
      this.friendsLoading = false;
    }
  }

  // ── 主题切换（与 blog-home 保持一致）──────────────────────────────────────

  private toggleTheme = () => {
    const next = this.isDarkMode ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem("data-theme", this.isDarkMode ? 'light' : 'dark')
    // MutationObserver 会自动更新 isDarkMode
  };

  private _syncWalineTheme(dark: boolean) {
    if (!this._walineContainer) return;
    if (dark) {
      this._walineContainer.classList.add('dark');
    } else {
      this._walineContainer.classList.remove('dark');
    }
  }

  // ── Waline 初始化 ──────────────────────────────────────────────────────────
  //
  // Waline 通过全局 CDN 加载（在 HTML 模板里引入）：
  //   <script src="https://unpkg.com/@waline/client@v3/dist/waline.js"></script>
  //   <link  rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css"/>
  //
  // 因为 shadow DOM 会隔离全局样式，我们把 waline 容器挂到 <body>，
  // 并通过 CSS 变量覆盖让它跟随 DaisyUI 主题。
  //
  // 若项目改用 npm 引入，把下面的 (window as any).Waline.init
  // 替换成 import { init } from '@waline/client' 即可，其余不变。

  private _initWaline() {
    // 找到 shadow root 内的占位元素，获取其在页面上的位置
    const slot = this.shadowRoot?.getElementById('waline-slot');
    if (!slot) return;

    // 创建 light DOM 容器，fixed/absolute 跟随 slot 位置
    // 实际项目中更常见做法：直接用 document.getElementById 的外部 div
    // 这里用最简单的：把容器 append 到 body，样式由外部 CSS 控制位置
    // ——更推荐方式：在 HTML 模板里预留 <div id="waline-portal"></div>
    //   然后这里直接 document.getElementById('waline-portal')

    let portal = document.getElementById('waline-portal') as HTMLElement | null;
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'waline-portal';
      document.body.appendChild(portal);
    }
    this._walineContainer = portal;

    // 深色模式初始同步
    this._syncWalineTheme(this.isDarkMode);

    // 初始化 Waline
    // 若通过 CDN 引入：
    const W = (window as any).Waline;
    if (!W) {
      console.warn('[about-page] Waline global not found. Make sure CDN script is loaded.');
      return;
    }

    const instance = W.init({
      el: portal,
      // ⚠️ 替换为你的 Waline 后端地址（Hono 服务挂载的路径）
      serverURL: '/api/comment',
      // 路径区分页面，about 固定
      path: '/about',
      // 深色模式：Waline 检测容器上的 .dark class
      dark: '.dark',
      // 语言
      lang: 'zh-CN',
      // 关闭 emoji（保持简洁风格），按需开启
      emoji: false,
      // 评论字数上限
      wordLimit: 500,
      // 分页
      pageSize: 20,
      // 允许 Markdown
      texRenderer: false,
    });

    this._walineDestroy = () => instance?.destroy?.();
  }

  // ── 友链渲染 ───────────────────────────────────────────────────────────────

  private _renderFriendCard(f: FriendLink) {
    return html`
      <a class="friend-card" href="${f.url}" target="_blank" rel="noopener noreferrer">
        ${f.avatar
        ? html`<img class="friend-avatar"
                      src="${f.avatar}"
                      alt="${f.name}"
                      loading="lazy"
                      @error="${(e: Event) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            img.nextElementSibling?.removeAttribute('style');
          }}"
                 />
                 <div class="friend-avatar-fallback" style="display:none">
                   ${f.name.charAt(0).toUpperCase()}
                 </div>`
        : html`<div class="friend-avatar-fallback">
                   ${f.name.charAt(0).toUpperCase()}
                 </div>`
      }

        <div class="friend-info">
          <div class="friend-name">
            ${f.name}
          </div>
          <div class="friend-author">@${f.author}</div>
          <div class="friend-desc">${f.description}</div>
        </div>

        <svg class="friend-arrow" viewBox="0 0 16 16" width="12" height="12"
             fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    `;
  }

  private _renderFriends() {
    if (this.friendsLoading) {
      return html`<div class="state-box">
        <span>// loading friends...</span>
      </div>`;
    }
    if (this.friendsError) {
      return html`<div class="state-box error">
        <span>// failed to fetch friends</span>
      </div>`;
    }
    if (this.friends.length === 0) {
      return html`<div class="state-box">
        <span>// no friends yet :(</span>
      </div>`;
    }
    return html`
      <div class="friends-grid">
        ${this.friends.map(f => this._renderFriendCard(f))}
      </div>
    `;
  }

  // ── Navbar（与其他页面保持一致）────────────────────────────────────────────

  private _renderNavbar() {
    return html`
      <header class="sticky top-0 z-50 flex items-center gap-3 px-4 lg:px-8 h-14
                     bg-base-100/70 backdrop-blur-md border-b border-base-content/8
                     transition-colors duration-300">

        <a href="/pages/home" class="font-mono font-bold text-base tracking-widest
                             text-base-content mr-2 flex-shrink-0
                             hover:text-primary transition-colors">
          NEXUS-BLOG
        </a>

        <div class="flex-1">
          <a href="/pages/about" class="btn btn-outline btn-xs">About</a>
        </div>

        <!-- 主题切换 -->
        <button @click="${this.toggleTheme}"
                class="btn btn-ghost btn-circle btn-sm
                       text-base-content/50 hover:text-base-content">
          ${this.isDarkMode
        ? html`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path stroke-linecap="round"
                          d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
                             M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>`
        : html`<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21
                             a9.003 9.003 0 008.354-5.646z"/>
                  </svg>`}
        </button>
      </header>`;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────

  private _renderFooter() {
    return html`
      <footer class="mt-16 border-t border-base-content/6
                     bg-base-100/30 backdrop-blur-sm">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                    py-5 flex flex-col sm:flex-row items-center justify-between
                    gap-3 font-mono text-[11px] text-base-content/25">
          <span>© ${new Date().getFullYear()} NEXUS</span>
          <span class="hidden sm:inline text-base-content/12">·</span>
          <span>Powered by Cloudflare Workers &amp; Lit</span>
          <span class="hidden sm:inline text-base-content/12">·</span>
          <span class="flex items-center gap-1 hover:text-warning transition-colors"></span>
        </div>
      </footer>`;
  }

  // ── render ─────────────────────────────────────────────────────────────────

  render() {
    const bg_image = { "background-image": this.isDarkMode ? `url('/../../../public/Image_00_02_00.png')` : `url('/../../../public/Image_m8xtbtm8xtbtm8xt.png')` }
    return html`

        <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        ${styleMap(bg_image)}
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
        z-index: -1; /* 确保在内容后面 */
      "></div>

      ${this._renderNavbar()}

      <main>
        <!-- ① 寄语区 -->
        <section class="bio-section">
          <div class="bio-label">// about</div>

          <div class="bio-prompt">
            <span>nexus@blog:~$</span>
            <span>cat README.md</span>
            <span class="cursor"></span>
          </div>

          <div class="bio-body">
<span class="comment"># 关于这里</span>

这里是 <span class="highlight">NEXUS-BLOG</span>，一个我的地方。

我喜欢我喜欢的，无论是代码或是代码，
历史还有历史，还是故事里里的角色。

<span class="comment">## 写什么</span>

- <span class="accent">技术</span>：Cloudflare Workers / TypeScript / 分布式系统
- <span class="accent">历史剧</span>：大明王朝 1566，以及权力与人性的那些事
- <span class="accent">随笔</span>：凡是觉得值得记下来的

<span class="comment">## 联系</span>

有什么想说的，留在下面的评论里就好。
          </div>
        </section>

        <div class="divider-line"><hr /></div>

        <!-- ② 友链区 -->
        <section class="friends-section">
          <div class="section-header">// friends</div>
          ${this._renderFriends()}
        </section>

        <div class="divider-line"><hr /></div>

        <!-- ③ 评论区占位（Waline 挂到 light DOM，见 _initWaline） -->
        <section class="comment-section">
          <div class="section-header">// comments</div>
          <!--
            Waline 容器不在 shadow DOM 内，而是挂到 <body> 的 #waline-portal。
            在你的 HTML 模板（index.html 或 about.html）里需要：

            1. 在 <head> 引入 Waline：
               <link rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css"/>
               <script src="https://unpkg.com/@waline/client@v3/dist/waline.js"></script>

            2. 在 <body> 内（about-page 组件之后）加：
               <div id="waline-portal"></div>

            3. 在你的全局 CSS 里加（控制 waline-portal 的位置和宽度）：
               #waline-portal {
                 max-width: 56rem;
                 margin: 0 auto;
                 padding: 0 1.5rem 4rem;
               }

            4. Waline CSS 变量覆盖（对齐 DaisyUI，放在全局 CSS）：
               参见下方 /* WALINE THEME OVERRIDES */
          -->
          <div id="waline-slot" class="comment-placeholder"></div>
        </section>
      </main>

      ${this._renderFooter()}
    `;
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * WALINE THEME OVERRIDES
 * 放到你的全局 CSS（如 global.css 或 about.html 的 <style>）里
 * 用 DaisyUI CSS 变量覆盖 Waline 默认主题，实现深/浅色自动适配
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * :root, [data-theme="light"] {
 *   --waline-theme-color:     oklch(var(--p));
 *   --waline-active-color:    oklch(var(--p));
 *   --waline-bgcolor:         oklch(var(--b1) / 0.5);
 *   --waline-bgcolor-hover:   oklch(var(--b2));
 *   --waline-bgcolor-light:   oklch(var(--b2));
 *   --waline-color:           oklch(var(--bc));
 *   --waline-border-color:    oklch(var(--bc) / 0.1);
 *   --waline-disable-bgcolor: oklch(var(--b2));
 *   --waline-disable-color:   oklch(var(--bc) / 0.3);
 *   --waline-code-bgcolor:    oklch(var(--b2));
 *   --waline-info-bgcolor:    oklch(var(--b2));
 *   --waline-info-color:      oklch(var(--bc) / 0.5);
 *   --waline-badge-color:     oklch(var(--p));
 *   --waline-font-size:       0.8rem;
 *   --waline-font-family:     ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
 * }
 *
 * [data-theme="dark"], #waline-portal.dark {
 *   --waline-bgcolor:         oklch(var(--b1) / 0.4);
 *   --waline-bgcolor-hover:   oklch(var(--b2));
 *   --waline-bgcolor-light:   oklch(var(--b2));
 *   --waline-border-color:    oklch(var(--bc) / 0.08);
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HTML 模板示例（about.html）
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <link rel="stylesheet" href="/dist/main.css" />
 *   <!-- Waline CSS -->
 *   <link rel="stylesheet" href="https://unpkg.com/@waline/client@v3/dist/waline.css"/>
 * </head>
 * <body>
 *   <about-page></about-page>
 *   <!-- Waline 挂载点（必须在 shadow DOM 之外） -->
 *   <div id="waline-portal"></div>
 *   <!-- Waline JS（在组件脚本之前或之后均可，_initWaline 会检测 window.Waline） -->
 *   <script src="https://unpkg.com/@waline/client@v3/dist/waline.js"></script>
 *   <script type="module" src="/dist/about-page.js"></script>
 * </body>
 * </html>
 */