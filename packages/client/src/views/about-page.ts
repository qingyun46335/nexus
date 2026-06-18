import { html, css, } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { DaisyUIElement } from '../components/daisy-ui-element';
import { styleMap } from 'lit/directives/style-map.js';
import type { NexusComment } from '../components/comment/nexus-comment';
import type { CommentSubmitPayload, NewSubComment, NewTopComment, PagedResult, SubComment, TopCommentString } from '../type/comment-types';

import '../components/comment/nexus-comment'
import axiosi from '../utils/axios';

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

  // MutationObserver 监听主题变化
  private _themeObserver: MutationObserver | null = null;

  @query('nexus-comment') private _commentEl!: NexusComment

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
      }
    });
    this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // 拉取友链数据
    this._fetchFriends();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._themeObserver?.disconnect();
  }

  firstUpdated() {

  }

  // ── 数据获取 ────────────────────────────────────────────────────────────────

  private async _fetchFriends() {
    try {
      const res = await axiosi.get<{ value: FriendLink[] }>('/client/about/getFriends');
      this.friends = res.data.value;
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

  private async _onLoadTopPage(e: CustomEvent) {
    const { page, pageSize } = e.detail as {
      page: number; pageSize: number
    }
    const res = await axiosi.get<{ value: PagedResult<TopCommentString> }>(`/client/comment/getTopComments?page=${page}&pageSize=${pageSize}`)
    const items = res.data.value.items.map(item => {
      return {
        id: item.id,
        content: item.content,
        authorName: item.authorName,
        authorEmail: item.authorEmail,
        createdAt: item.createdAt,
        replyCount: item.replyCount,             // 子评论总数，用于子楼分页
        replies: JSON.parse(item.replies),          // 默认前 N 条
        deleted: item.deleted,
        role: item.role,
      }
    })
    this._commentEl.setTopPage({
      items: items,
      total: res.data.value.total,
      page: res.data.value.page,
      pageSize: res.data.value.pageSize,
    })
  }

  private async _onLoadSubPage(e: CustomEvent) {
    const { parentId, page, pageSize } = e.detail as {
      parentId: string; page: number; pageSize: number
    }
    const res = await axiosi.get<{ value: PagedResult<SubComment> }>(`/client/comment/getSubComments?parentId=${parentId}&page=${page}&pageSize=${pageSize}`)
    this._commentEl.setSubPage(parentId, res.data.value)
  }

  private async _onCommentSubmit(e: CustomEvent) {
    const payload = e.detail as CommentSubmitPayload

    const form = new FormData()

    form.append("comment", JSON.stringify(payload))

    try {
      if (payload.parentId !== undefined) {
        const res = await axiosi.post<{ value: NewSubComment }>('/client/comment/addComment', form)
        this._commentEl.addSubComment(res.data.value)
      } else {
        const res = await axiosi.post<{ value: NewTopComment }>('/client/comment/addComment', form)
        this._commentEl.addTopComment(res.data.value)
      }
    } catch (err) {
      console.error('发表评论失败', err)
      this._commentEl.submitError()
      // 在这里展示 toast 提示失败
    }
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

  renderComment() {
    return html`
      <nexus-comment
        article-id="${0}"
        top-page-size="10"
        sub-page-size="5"
        @load-top-page=${this._onLoadTopPage}
        @load-sub-page=${this._onLoadSubPage}
        @comment-submit=${this._onCommentSubmit}
      ></nexus-comment>
    `
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

这里是 <span class="highlight">NEXUS-BLOG</span>，希望可以和你讨论有趣的东西

<span class="comment">## 写什么</span>

- <span class="accent">技术</span>：Cloudflare Workers / TypeScript / Java / Go
- <span class="accent">历史剧</span>：大明王朝 1566
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

        <section class=" comment-section">
          <div class="section-header">// comments</div>
          ${this.renderComment()}
        </section>

      </main>

      ${this._renderFooter()}
    `;
  }
}