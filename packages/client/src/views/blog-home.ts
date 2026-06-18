import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import axios from 'axios';
import { DaisyUIElement } from '../components/daisy-ui-element';
import { styleMap } from 'lit/directives/style-map.js';

// ── 类型定义 ────────────────────────────────────────────

interface Attachment {
    filename: string;
    type: string;
    size: number;
    relativePath: string;
}

interface Article {
    id: string;
    title: string;
    description: string;
    tags: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    views: number;
    wordCount: number;
    attachments: string;
}

interface TagItem {
    id: string;
    name: string;
    count: number;
}

// 后端分页响应结构（按需调整字段名）
interface PagedResponse<T> {
    code: number
    msg: string,
    value: {
        items: T[];
        total: number;
        page: number;
        pageSize: number;
    }
}

// 时间归档条目
interface ArchiveMonth {
    label: string;   // e.g. "2026-06"
    count: number;
}

// 侧边栏面板类型
type SidePanel = 'hot' | 'archive';

const PAGE_SIZE = 5;

// ── API 路径（统一在此处修改）────────────────────────────
const API = {
    // GET /api/tags → TagItem[]
    tags: '/api/client/tag/getTags',

    // GET /api/articles?page=1&pageSize=5&tag=XXX&q=YYY
    // → PagedResponse<Article>
    articles: '/api/client/article/getArticles',

    // GET /api/articles/hot?limit=5 → Article[]  (按 views desc)
    hotArticles: '/api/client/article/hotArticles',

    archiveMonths: '/api/client/article/getArchiveMonth',

    // 附件访问前缀
    attachment: (path: string) => `/api/client/assets${path}`,
} as const;

// ═══════════════════════════════════════════════════════
//  BlogHome 组件
// ═══════════════════════════════════════════════════════

@customElement('blog-home')
export class BlogHome extends DaisyUIElement {

    protected createRenderRoot() { return this; }

    // ── 文章列表状态
    @state() private pagedArticles: Article[] = [];   // 当前页数据
    @state() private totalArticles: number = 0;
    @state() private currentPage: number = 1;
    @state() private loadingArticles: boolean = true;

    // ── 标签云状态
    @state() private allTags: TagItem[] = [];
    @state() private loadingTags: boolean = true;

    // ── 热度榜 / 归档状态
    @state() private hotArticles: Article[] = [];
    @state() private archiveMonths: ArchiveMonth[] = [];
    @state() private sidePanel: SidePanel = 'hot';
    @state() private loadingSide: boolean = true;

    // ── 统计（全量，只在初始化时拉一次）
    @state() private statsTotal: number = 0;
    @state() private statsTotalWords: number = 0;

    // ── 筛选条件
    @state() private selectedTag: string | null = null;
    @state() private searchQuery: string = '';

    // ── 移动端
    @state() private mobileTagOpen: boolean = false;

    // ── 派生计算
    get totalPages(): number {
        return Math.max(1, Math.ceil(this.totalArticles / PAGE_SIZE));
    }

    // ── 生命周期 ───────────────────────────────────────

    async connectedCallback() {
        super.connectedCallback();
        this.loadingLightOrDark()
        this._syncTheme();
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', () => this._syncTheme());

        // 三个独立并发请求
        await Promise.all([
            this._fetchTags(),
            this._fetchArticles(),
            this._fetchSideData(),
            this._fetcharchiveMonths(),
        ]);
    }

    private loadingLightOrDark() {
        const dark = window.localStorage.getItem("data-theme")
        if (dark && dark === "dark") {
            document.documentElement.setAttribute("data-theme", "dark")
        } else {
            document.documentElement.setAttribute("data-theme", "light")
        }
    }

    private _syncTheme() {
        const el = document.documentElement;
        if (!el.getAttribute('data-theme')) {
            el.setAttribute('data-theme',
                window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        }
    }

    toggleTheme() {
        const el = document.documentElement;
        window.localStorage.setItem("data-theme", el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
        el.setAttribute('data-theme', el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

        this.requestUpdate();
    }

    get isDarkMode() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

    // ── 数据请求 ───────────────────────────────────────

    /** 标签云：GET /api/tags → TagItem[] */
    private async _fetchTags() {
        this.loadingTags = true;
        try {
            // ── 真实接口 ──
            const res = await axios.get<{ code: number, value: TagItem[] }>(API.tags);
            this.allTags = res.data.value;
            if (res.data.code === 300) {
                this.allTags = []
                this.loadingTags = false;
            }

            // ── Mock ──
            // await _delay(200);
            // const counter = new Map<string, number>();
            // MOCK_ARTICLES.forEach(a => JSON.parse(a.tags).forEach(t => counter.set(t, (counter.get(t) ?? 0) + 1)));
            // this.allTags = [...counter.entries()]
            //     .sort((a, b) => b[1] - a[1])
            //     .map(([name, count]) => ({ name, count }));
        } catch (e) {
            console.error('fetchTags failed:', e);
        } finally {
            this.loadingTags = false;
        }
    }

    /**
     * 文章分页查询：GET /api/articles?page=N&pageSize=5&tag=X&q=Y
     * → PagedResponse<Article>
     * 筛选条件或翻页时均调用此方法。
     */
    private async _fetchArticles(page = this.currentPage) {
        this.loadingArticles = true;
        try {
            // ── 真实接口 ──
            const res = await axios.get<PagedResponse<Article>>(API.articles, {
                params: {
                    page,
                    pageSize: PAGE_SIZE,
                    ...(this.selectedTag ? { tag: this.selectedTag } : {}),
                    ...(this.searchQuery ? { q: this.searchQuery } : {}),
                },
            });
            if (res.data.code === 300) {
                this.pagedArticles = [];
                this.totalArticles = 0;
                this.currentPage = 0;
            } else if (res.data.code === 200) {
                this.pagedArticles = res.data.value.items;
                this.totalArticles = res.data.value.total;
                this.currentPage = res.data.value.page;
            }


            // ── Mock（本地过滤+切片模拟后端）──
            // await _delay(250);
            // const q = this.searchQuery.toLowerCase();
            // const filtered = MOCK_ARTICLES.filter(a => {
            //     const mq = !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
            //     const mt = !this.selectedTag || a.tags.includes(this.selectedTag);
            //     return mq && mt;
            // });
            // this.totalArticles = filtered.length;
            // this.currentPage = page;
            // this.pagedArticles = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            // // 统计（仅首次全量时计算）
            // if (this.statsTotal === 0) {
            //     this.statsTotal = MOCK_ARTICLES.length;
            //     this.statsTotalWords = MOCK_ARTICLES.reduce((s, a) => s + a.wordCount, 0);
            // }
        } catch (e) {
            console.error('fetchArticles failed:', e);
        } finally {
            this.loadingArticles = false;
        }
    }

    /**
     * 侧边栏热度榜：GET /api/articles/hot?limit=5 → Article[]
     * 归档数据从返回结果中按月聚合（也可拆成独立接口）。
     */
    private async _fetchSideData() {
        this.loadingSide = true;
        try {
            // ── 真实接口 ──
            const res = await axios.get<{ code: number, value: Article[] }>(API.hotArticles, { params: { limit: 5 } });

            if (res.data.code === 300) {
                this.hotArticles = []
            } else {
                this.hotArticles = res.data.value;
            }

            // ── Mock ──
            // await _delay(200);
            // this.hotArticles = [...MOCK_ARTICLES]
            //     .sort((a, b) => b.views - a.views)
            //     .slice(0, 5);

            // // 时间归档：按 YYYY-MM 聚合
            // const counter = new Map<string, number>();
            // MOCK_ARTICLES.forEach(a => {
            //     const ym = a.createdAt.slice(0, 7);
            //     counter.set(ym, (counter.get(ym) ?? 0) + 1);
            // });
            // this.archiveMonths = [...counter.entries()]
            //     .sort((a, b) => b[0].localeCompare(a[0]))
            //     .map(([label, count]) => ({ label, count }));
        } catch (e) {
            console.error('fetchSideData failed:', e);
        } finally {
            this.loadingSide = false;
        }
    }

    private async _fetcharchiveMonths() {
        const res = await axios.get<{ code: number, value: ArchiveMonth[] }>(API.archiveMonths)

        if (res.data.code === 300) {
            this.archiveMonths = []
        } else {
            this.archiveMonths = res.data.value;
        }
    }

    // ── 事件处理 ───────────────────────────────────────

    handleSearch(e: InputEvent) {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this._refetch();
    }

    clearSearch() {
        this.searchQuery = '';
        this._refetch();
    }

    handleTagSelect(tagid: string | null) {
        this.selectedTag = this.selectedTag === tagid ? null : tagid;
        this.mobileTagOpen = false;
        this._refetch();
    }

    goToPage(page: number) {
        if (page < 1 || page > this.totalPages) return;
        this._fetchArticles(page);
        // 滚动回文章列表顶部
        (this.querySelector('#article-list-top') as HTMLElement | null)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /** 筛选条件变化时重置到第1页并重新拉数据 */
    private _refetch() {
        this._fetchArticles(1);
    }

    switchSidePanel(dir: -1 | 1) {
        const panels: SidePanel[] = ['hot', 'archive'];
        const idx = panels.indexOf(this.sidePanel);
        this.sidePanel = panels[(idx + dir + panels.length) % panels.length];
    }

    // ── 工具方法 ───────────────────────────────────────

    getReadingTime(wc: number) { return Math.ceil(wc / 400); }

    getCoverImage(attachments: Attachment[]): string | null {
        const img = attachments.find(a => ['image'].includes(a.type.toLowerCase()));
        return img ? API.attachment("/" + img.type + img.relativePath) : null;
    }

    getMediaBadges(attachments: Attachment[]) {
        const has = (exts: string[]) => attachments.some(a => exts.includes(a.type.toLowerCase()));
        const badges: { icon: string; label: string; cls: string }[] = [];
        if (has(["audio"])) badges.push({ icon: '🎧', label: '音轨', cls: 'text-info' });
        if (has(['video'])) badges.push({ icon: '🎬', label: '视频', cls: 'text-success' });
        if (has(['text', 'unsupported'])) badges.push({ icon: '📂', label: '附档', cls: 'text-warning' });
        return badges;
    }

    formatDate(d: string) { return d.split(' ')[0]; }

    formatArchiveLabel(ym: string) {
        const [y, m] = ym.split('-');
        return `${y} 年 ${parseInt(m)} 月`;
    }

    formatNumber(n: number) {
        return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n.toLocaleString();
    }

    getTagName() {
        const tag = this.allTags.find(item => item.id === this.selectedTag)
        if (tag && tag !== undefined) {
            return tag.name
        }
        return ""
    }

    // ── 子模板 ─────────────────────────────────────────

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

            <!-- 移动端标签触发按钮 -->
            <button @click="${() => { this.mobileTagOpen = !this.mobileTagOpen; }}"
                    class="md:hidden btn btn-ghost btn-sm gap-1 text-xs font-mono normal-case
                           ${this.selectedTag ? 'text-secondary' : 'text-base-content/50'}">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${this.selectedTag ? `#${this.getTagName()}` : 'Tags'}
            </button>

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

    /** Navbar 下方统计概览条（桌面可见，填充空白并提供信息密度）*/
    private _renderStatsBar() {
        const totalReadMin = Math.ceil(this.statsTotalWords / 400);
        return html`
        <div class="border-b border-base-content/6 bg-base-100/40 backdrop-blur-sm">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                        flex items-center gap-6 sm:gap-10 h-9 overflow-x-auto
                        font-mono text-[11px] text-base-content/35 whitespace-nowrap">
                <span>
                    <span class="text-base-content/60 font-medium">${this.statsTotal}</span>
                    &nbsp;篇文章
                </span>
                <span class="text-base-content/15">|</span>
                <span>
                    <span class="text-base-content/60 font-medium">
                        ${this.formatNumber(this.statsTotalWords)}
                    </span>
                    &nbsp;字
                </span>
                <span class="text-base-content/15">|</span>
                <span>
                    约&nbsp;<span class="text-base-content/60 font-medium">${totalReadMin}</span>
                    &nbsp;min 阅读
                </span>
                <span class="text-base-content/15">|</span>
                <span>${this.allTags.length}&nbsp;个标签</span>
                <!-- 右侧弹性空间 -->
                <span class="flex-1"></span>
                <span class="opacity-60 hidden sm:inline">
                    最近更新：${this.pagedArticles[0]
                ? this.formatDate(this.pagedArticles[0].updatedAt)
                : '—'}
                </span>
            </div>
        </div>`;
    }

    /** 移动端：标签展开面板 + 搜索框 */
    private _renderMobileExpandArea() {
        return html`
        <div class="md:hidden">
            <!-- 标签面板（收起/展开） -->
            <div class="overflow-hidden transition-all duration-300
                        ${this.mobileTagOpen ? 'max-h-48' : 'max-h-0'}">
                <div class="px-4 py-3 bg-base-100/80 backdrop-blur-md
                            border-b border-base-content/8">
                    ${this._renderTagCloud('mobile')}
                </div>
            </div>
        </div>`;
    }

    private _renderTagCloud(ctx: 'sidebar' | 'mobile') {
        const isSidebar = ctx === 'sidebar';
        if (this.loadingTags) {
            return html`
            <div class="flex flex-wrap gap-1.5">
                ${[1, 2, 3, 4].map(() => html`
                    <div class="h-6 w-14 rounded-md bg-base-200/60 animate-pulse"></div>`)}
            </div>`;
        }
        return html`
        <div class="flex flex-wrap gap-1.5">
            <button @click="${() => this.handleTagSelect(null)}"
                    class="btn btn-xs rounded-md font-mono normal-case
                           ${!this.selectedTag
                ? 'btn-primary'
                : 'btn-ghost bg-base-200/60 text-base-content/60 hover:bg-base-200'}">
                全部
                <span class="ml-1 opacity-40 text-[10px]">${this.statsTotal}</span>
            </button>
            ${this.allTags.map(({ id, name, count }) => html`
                <button @click="${() => this.handleTagSelect(id)}"
                        class="btn btn-xs rounded-md font-sans normal-case
                               ${this.selectedTag === id
                        ? 'btn-secondary'
                        : 'btn-ghost bg-base-200/60 text-base-content/60 hover:bg-base-200'}">
                    <span class="opacity-50 font-mono text-[10px]">#</span>${name}
                    <span class="ml-0.5 opacity-35 text-[10px]">${count}</span>
                </button>`)}
        </div>
        ${isSidebar ? html`
            <div class="mt-4 pt-3 border-t border-base-content/6
                        font-mono text-[10px] text-base-content/25 space-y-0.5">
                <div>TOTAL&nbsp;&nbsp;${this.statsTotal}</div>
                <div>SHOWN&nbsp;&nbsp;${this.totalArticles}</div>
            </div>` : ''}`;
    }

    /** 搜索框（放文章列表区顶部） */
    private _renderSearchBox() {
        return html`
        <div class="relative flex items-center mb-4">
            <svg class="absolute left-3 w-3.5 h-3.5 text-base-content/35 pointer-events-none"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M21 21l-4.35-4.35m0 0A7 7 0 106.65 6.65a7 7 0 009.9 9.9z"/>
            </svg>
            <input type="text" placeholder="搜索标题、摘要…"
                   .value="${this.searchQuery}"
                   @input="${this.handleSearch}"
                   class="input input-sm w-full pl-9 pr-9
                          bg-base-100/60 backdrop-blur-sm
                          border-base-content/10 focus:border-primary/40
                          focus:bg-base-100/80 placeholder:text-base-content/25
                          text-sm rounded-lg transition-all" />
            ${this.searchQuery ? html`
                <button @click="${this.clearSearch}"
                        class="absolute right-2 btn btn-ghost btn-xs btn-circle
                               opacity-40 hover:opacity-80 transition-opacity">
                    ✕
                </button>` : ''}
        </div>`;
    }

    private _renderFilterChips() {
        if (!this.selectedTag && !this.searchQuery) return html``;
        return html`
        <div class="flex items-center flex-wrap gap-2 mb-4
                    font-mono text-[11px] text-base-content/40">
            <span>FILTER</span>
            ${this.selectedTag ? html`
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded
                             bg-secondary/12 text-secondary border border-secondary/20">
                    #${this.getTagName()}
                    <button @click="${() => this.handleTagSelect(null)}"
                            class="hover:text-error transition-colors font-bold ml-0.5">✕</button>
                </span>` : ''}
            ${this.searchQuery ? html`
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded
                             bg-base-200/70 text-base-content/55 border border-base-content/10">
                    "${this.searchQuery}"
                    <button @click="${this.clearSearch}"
                            class="hover:text-error transition-colors font-bold ml-0.5">✕</button>
                </span>` : ''}
            <button @click="${() => { this.selectedTag = null; this.clearSearch(); }}"
                    class="text-error/60 hover:text-error transition-colors ml-1">
                清空
            </button>
        </div>`;
    }

    private _renderArticleCard(article: Article) {
        const cover = this.getCoverImage(JSON.parse(article.attachments));
        const badges = this.getMediaBadges(JSON.parse(article.attachments));
        const readMin = this.getReadingTime(article.wordCount);

        const fm_display = { display: cover != null ? "block" : "none" }

        return html`
        <article class="group relative flex
                        bg-base-100/65 backdrop-blur-md hover:bg-base-100/80
                        border border-base-content/8 hover:border-base-content/15
                        rounded-xl overflow-hidden transition-all duration-200
                        shadow-xs hover:shadow-sm">

            <!-- 封面 -->
            <div style="${styleMap(fm_display)}" class="relative flex-shrink-0 w-28 sm:w-36 md:w-44 self-stretch
                        bg-gradient-to-br from-primary/6 to-secondary/8
                        border-r border-base-content/6 overflow-hidden">
                ${cover ? html`
                    <img src="${cover}" alt=""
                         class="absolute inset-0 w-full h-full object-cover
                                transition-transform duration-500 group-hover:scale-[1.04]"/>
                    <div class="absolute inset-0
                                bg-gradient-to-r from-transparent to-base-100/10"></div>
                ` : html`
                    <div class="absolute inset-0 flex items-center justify-center opacity-8">
                        <svg viewBox="0 0 60 60" class="w-14 h-14 text-base-content"
                             fill="none" stroke="currentColor" stroke-width="0.8">
                            <rect x="8" y="8" width="44" height="44" rx="2"/>
                            <path d="M8 40l12-14 10 10 8-8 14 12"/>
                            <circle cx="20" cy="22" r="4"/>
                        </svg>
                    </div>`}
            </div>

            <!-- 内容 -->
            <div class="flex flex-col justify-between flex-1 min-w-0 p-4 sm:p-5">

                <!-- 元信息 -->
                <div class="flex items-center flex-wrap gap-x-2.5 gap-y-1 mb-1.5
                            font-mono text-[11px] text-base-content/35">
                    <time>${this.formatDate(article.createdAt)}</time>
                    <span class="text-base-content/15">·</span>
                    <span>${readMin} min</span>
                    <span class="text-base-content/15">·</span>
                    <span>${article.wordCount.toLocaleString()} 字</span>
                    ${badges.length ? html`
                        <span class="text-base-content/15">·</span>
                        ${badges.map(b => html`
                            <span class="inline-flex items-center gap-0.5 ${b.cls} opacity-65">
                                <span>${b.icon}</span>
                                <span class="text-[10px]">${b.label}</span>
                            </span>`)}` : ''}
                </div>

                <!-- 标题 -->
                <h2 class="text-sm sm:text-[15px] font-semibold leading-snug
                           text-base-content group-hover:text-primary
                           transition-colors duration-200 line-clamp-2 mb-1.5">
                    <a href="/pages/article?article=${article.id}"
                       class="focus-visible:outline-none
                              before:absolute before:inset-0 before:content-['']">
                        ${article.title}
                    </a>
                </h2>

                <!-- 摘要 -->
                <p class="text-xs sm:text-sm text-base-content/50 leading-relaxed
                          line-clamp-2 mb-3">
                    ${article.description}
                </p>

                <!-- 标签 -->
                <div class="flex flex-wrap gap-1.5 mt-auto">
                    ${JSON.parse(article.tags).map((t: string) => html`
                        <span @click="${(e: Event) => { e.preventDefault(); this.handleTagSelect(t); }}"
                              class="inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5
                                     rounded cursor-pointer transition-colors duration-150 font-mono
                                     ${this.selectedTag === t
                ? 'bg-secondary text-secondary-content'
                : 'bg-base-200/70 text-base-content/45 hover:bg-base-200 hover:text-base-content/75'}">
                            <span class="opacity-50">#</span>${t}
                        </span>`)}
                </div>
            </div>
        </article>`;
    }

    /** 分页控件 */
    private _renderPagination() {
        if (this.totalPages <= 1) return html``;
        const pages = _buildPageNumbers(this.currentPage, this.totalPages);
        return html`
        <div class="flex items-center justify-center gap-1 mt-8 font-mono text-sm select-none">
            <!-- 上一页 -->
            <button @click="${() => this.goToPage(this.currentPage - 1)}"
                    ?disabled="${this.currentPage <= 1}"
                    class="btn btn-ghost btn-sm btn-square
                           disabled:opacity-20 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
            </button>

            ${pages.map(p => p === '…' ? html`
                <span class="w-8 text-center text-base-content/25 text-xs">…</span>
            ` : html`
                <button @click="${() => this.goToPage(p as number)}"
                        class="btn btn-sm btn-square
                               ${this.currentPage === p
                ? 'btn-primary'
                : 'btn-ghost text-base-content/50 hover:text-base-content'}">
                    ${p}
                </button>`)}

            <!-- 下一页 -->
            <button @click="${() => this.goToPage(this.currentPage + 1)}"
                    ?disabled="${this.currentPage >= this.totalPages}"
                    class="btn btn-ghost btn-sm btn-square
                           disabled:opacity-20 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </button>

            <span class="ml-3 text-[11px] text-base-content/25">
                ${this.currentPage} / ${this.totalPages}
            </span>
        </div>`;
    }

    /** 右侧侧边栏：热度榜 ↔ 时间归档 */
    private _renderSideWidget() {
        const panelMeta: Record<SidePanel, { label: string; icon: string }> = {
            hot: { label: '文章热度', icon: '🔥' },
            archive: { label: '时间归档', icon: '📅' },
        };
        const panels: SidePanel[] = ['hot', 'archive'];
        const curIdx = panels.indexOf(this.sidePanel);

        return html`
        <div class="bg-base-100/60 backdrop-blur-md rounded-xl
                    border border-base-content/8 overflow-hidden">

            <!-- 面板头：左箭头 · 标题 · 右箭头 -->
            <div class="flex items-center gap-1 px-4 py-2.5
                        border-b border-base-content/8">
                <button @click="${() => this.switchSidePanel(-1)}"
                        class="btn btn-ghost btn-xs btn-square text-base-content/30
                               hover:text-base-content transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                    </svg>
                </button>
                <div class="flex-1 text-center">
                    <span class="font-mono text-[11px] tracking-widest
                                 text-base-content/40 uppercase">
                        ${panelMeta[this.sidePanel].icon}&nbsp;
                        ${panelMeta[this.sidePanel].label}
                    </span>
                </div>
                <button @click="${() => this.switchSidePanel(1)}"
                        class="btn btn-ghost btn-xs btn-square text-base-content/30
                               hover:text-base-content transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>

            <!-- 面板指示点 -->
            <div class="flex justify-center gap-1 pt-2">
                ${panels.map((_p, i) => html`
                    <span class="w-1 h-1 rounded-full transition-colors
                                 ${i === curIdx ? 'bg-primary' : 'bg-base-content/15'}"></span>`)}
            </div>

            <!-- 内容区 -->
            <div class="p-3 pt-2">
                ${this.loadingSide ? html`
                    <div class="space-y-2 py-2">
                        ${[1, 2, 3, 4, 5].map(() => html`
                            <div class="flex gap-2 animate-pulse">
                                <div class="w-4 h-3 bg-base-200/60 rounded mt-0.5 flex-shrink-0"></div>
                                <div class="flex-1 h-3 bg-base-200/60 rounded"></div>
                            </div>`)}
                    </div>
                ` : this.sidePanel === 'hot'
                ? this.hotArticles.length === 0
                    ? this._renderEmpty('暂无热门文章')
                    : this._renderHotList()
                : this.archiveMonths.length === 0
                    ? this._renderEmpty('暂无归档记录')
                    : this._renderArchiveList()}
            </div>
        </div>`;
    }

    private _renderHotList() {
        return html`
        <ol class="space-y-0.5">
            ${this.hotArticles.map((a, i) => html`
                <li>
                    <a href="/pages/article?article=${a.id}"
                       class="flex items-start gap-2.5 p-2 rounded-lg
                              hover:bg-base-200/50 transition-colors group/item">
                        <span class="font-mono text-[11px] w-4 flex-shrink-0 mt-0.5
                                     ${i === 0 ? 'text-warning font-bold'
                : i === 1 ? 'text-base-content/40'
                    : i === 2 ? 'text-base-content/30'
                        : 'text-base-content/20'}">
                            ${i + 1}
                        </span>
                        <div class="flex-1 min-w-0">
                            <div class="text-[12px] text-base-content/70 leading-snug
                                        line-clamp-2 group-hover/item:text-primary
                                        transition-colors">
                                ${a.title}
                            </div>
                            <div class="flex items-center gap-1.5 mt-1
                                        font-mono text-[10px] text-base-content/25">
                                <span>👁 ${a.views}</span>
                                <span>·</span>
                                <span>${this.getReadingTime(a.wordCount)} min</span>
                            </div>
                        </div>
                    </a>
                </li>`)}
        </ol>`;
    }

    private _renderArchiveList() {
        return html`
        <ul class="space-y-0.5">
            ${this.archiveMonths.map(({ label, count }) => html`
                <li>
                    <button @click="${() => {/* 可扩展为按月筛选 */ }}"
                            class="w-full flex items-center justify-between px-2 py-1.5
                                   rounded-lg hover:bg-base-200/50 transition-colors
                                   text-left group/arc">
                        <span class="font-mono text-[12px] text-base-content/55
                                     group-hover/arc:text-base-content transition-colors">
                            ${this.formatArchiveLabel(label)}
                        </span>
                        <span class="font-mono text-[10px] text-base-content/25
                                     bg-base-200/50 px-1.5 py-0.5 rounded">
                            ${count}
                        </span>
                    </button>
                </li>`)}
        </ul>`;
    }

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
                <span
                   class="flex items-center gap-1 hover:text-warning transition-colors">
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

    private _renderEmpty(message = '暂无内容', hint?: string) {
        return html`
    <div class="flex flex-col items-center justify-center py-20
                text-base-content/25 font-mono text-sm text-center">
        <div class="text-5xl mb-4 opacity-30">∅</div>
        <div>${message}</div>
        ${hint ? html`<div class="text-xs mt-1 opacity-60">${hint}</div>` : ''}
    </div>`;
    }

    // ── 主渲染 ─────────────────────────────────────────

    render() {
        const bg_image = { "background-image": this.isDarkMode ? `url('/../../../public/Image_00_02_00.png')` : `url('/../../../public/Image_m8xtbtm8xtbtm8xt.png')` }
        return html`
        <div  style="${styleMap(bg_image)} background-repeat: no-repeat; background-size: cover;" class="flex flex-col min-h-screen text-base-content transition-colors duration-300">

            ${this._renderNavbar()}
            <!-- ${this._renderStatsBar()} -->
            ${this._renderMobileExpandArea()}

            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
                        py-6 lg:py-8
                        flex flex-col md:flex-row gap-6 lg:gap-8 items-start flex-1">

                <!-- ══ 主内容 ══ -->
                <main class="flex-1 min-w-0 w-full">

                    <!-- 锚点：翻页后滚回此处 -->
                    <div id="article-list-top" class="-mt-2 pt-2"></div>

                    ${this._renderSearchBox()}
                    ${this._renderFilterChips()}

                    ${this.loadingArticles ? html`
                        <div class="space-y-4">
                            ${[1, 2, 3].map(() => html`
                                <div class="flex bg-base-100/40 backdrop-blur-md rounded-xl
                                            border border-base-content/8 overflow-hidden animate-pulse">
                                    <div class="w-36 h-24 bg-base-200/60 flex-shrink-0"></div>
                                    <div class="flex-1 p-5 space-y-2.5">
                                        <div class="h-2 bg-base-200/60 rounded w-1/3"></div>
                                        <div class="h-4 bg-base-200/70 rounded w-3/4"></div>
                                        <div class="h-3 bg-base-200/50 rounded w-full"></div>
                                        <div class="h-3 bg-base-200/50 rounded w-2/3"></div>
                                    </div>
                                </div>`)}
                        </div>
                    ` : this.pagedArticles.length === 0 ? this._renderEmpty('没有匹配的文章', '换个关键词或标签') : html`
                        <div class="space-y-4">
                            ${this.pagedArticles.map(a => this._renderArticleCard(a))}
                        </div>
                        ${this._renderPagination()}
                    `}
                </main>

                <!-- ══ 侧边栏（桌面）══ -->
                <aside class="hidden md:flex flex-col gap-4
                              flex-shrink-0 w-52 lg:w-56
                              sticky top-[3.5rem] self-start">

                    <!-- 标签云 -->
                    <div class="bg-base-100/60 backdrop-blur-md rounded-xl
                                border border-base-content/8 p-4">
                        <div class="flex items-center justify-between mb-3 pb-2
                                    border-b border-base-content/8">
                            <span class="font-mono text-[11px] tracking-widest
                                         text-base-content/35 uppercase">Tags</span>
                            ${this.selectedTag ? html`
                                <button @click="${() => this.handleTagSelect(null)}"
                                        class="text-[11px] text-error/60 hover:text-error
                                               font-mono transition-colors">
                                    清除
                                </button>` : ''}
                        </div>
                        ${this._renderTagCloud('sidebar')}
                    </div>

                    <!-- 热度榜 / 归档切换小组件 -->
                    ${this._renderSideWidget()}

                </aside>

            </div>

            ${this._renderFooter()}
        </div>`;
    }
}

// ── 工具函数 ──────────────────────────────────────────────

// function _delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * 生成分页页码数组，超出范围用 '…' 省略。
 * 示例：当前第5页共10页 → [1, '…', 4, 5, 6, '…', 10]
 */
function _buildPageNumbers(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        pages.push(p);
    }
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
}