import { html, css, nothing } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import type { AdminArticle, TagItem } from "../../type/admin";

import "../../components/admin/article-table";
import "../../components/modal/admin/admin_article_modal";
import "../../components/admin/sidebar-stats";
import "../../components/modal/admin/tag-edit-modal";
import "../../components/admin-header";
import axiosi from "../../utils/axios";
import { AuthLitElement } from "../../components/auth-lit-element";

// const testTags: TagEditItem[] = [
//   { id: "", name: "测试", count: 2, status: "active", isEditing: false },
//   { id: "", name: "文章", count: 2, status: "active", isEditing: false },
//   { id: "", name: "示例", count: 1, status: "active", isEditing: false },
//   { id: "", name: "标签A", count: 5, status: "active", isEditing: false },
//   { id: "", name: "标签B", count: 3, status: "active", isEditing: false },
//   { id: "", name: "标签C", count: 8, status: "active", isEditing: false },
//   { id: "", name: "测试", count: 2, status: "active", isEditing: false },
//   { id: "", name: "文章", count: 2, status: "active", isEditing: false },
//   { id: "", name: "示例", count: 1, status: "active", isEditing: false },
//   { id: "", name: "标签A", count: 5, status: "active", isEditing: false },
//   { id: "", name: "标签B", count: 3, status: "active", isEditing: false },
//   { id: "", name: "标签C", count: 8, status: "active", isEditing: false },
// ];

// ────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────

@customElement("article-page")
export class ArticlePage extends (AuthLitElement) {

  // ── Props ────────────────────────────────────────────────
  @property({ type: String }) apiBase = "/api";

  // ── Filter state ─────────────────────────────────────────
  @state() private keyword = "";
  @state() private dateFrom = "";
  @state() private dateTo = "";
  @state() private selectedTags: Set<string> = new Set();

  // ── Pagination ───────────────────────────────────────────
  @state() private page = 1;
  @state() private pageSize = 10;
  @state() private total = 0;

  // ── Data ─────────────────────────────────────────────────
  @state() private articles: AdminArticle[] = [];
  @state() private allTags: TagItem[] = [];
  @state() private loading = false;
  @state() private error1 = "";
  @state() private dateIntervalType: "createdAt" | "updatedAt" = "createdAt";

  log() {
    console.log(this.error1, this.dateIntervalType)
  }

  @state() private showUploadModal = false;

  @state() private showTagEditModal = false;



  // ── Lifecycle ────────────────────────────────────────────
  connectedCallback() {
    super.connectedCallback();
    this._fetchTags();
    this._fetchArticles();
  }

  // ── API calls ────────────────────────────────────────────
  private async _fetchTags() {
    try {
      const res = await axiosi.get<{ value: TagItem[] }>(`/admin/tag/selectTags?status=active`);
      this.allTags = res.data.value;
    } catch {
      // tags failing silently is acceptable
    }
  }

  private async _fetchArticles() {
    this.loading = true;
    this.error1 = "";
    try {
      const params: Record<string, unknown> = {
        page: this.page,
        pageSize: this.pageSize,
      };
      if (this.keyword.trim()) params.keyword = this.keyword.trim();
      if (this.dateIntervalType) params.dateIntervalType = this.dateIntervalType;
      if (this.dateFrom) params.dateFrom = this.dateFrom;
      if (this.dateTo) params.dateTo = this.dateTo;
      if (this.selectedTags.size)
        params.tags = [...this.selectedTags].join(",");

      const res = await axiosi.get(
        "/admin/article/selectArticle",
        { params },
      );
      this.articles = res.data.value.rows;
      this.total = res.data.value.total;
    } catch (e: unknown) {
      this.error1 =
        e instanceof Error ? e.message : "请求失败，请检查网络后重试";
    } finally {
      this.loading = false;
    }
  }

  // ── Handlers ─────────────────────────────────────────────
  private _onSearch(e: Event) {
    e.preventDefault();
    this.page = 1;
    this._fetchArticles();
  }

  private _onKeywordInput(e: Event) {
    this.keyword = (e.target as HTMLInputElement).value;
  }

  private _onDateFrom(e: Event) {
    this.dateFrom = (e.target as HTMLInputElement).value.replace("T", " ") + ":00";
    this.page = 1;
    this._fetchArticles();
  }

  private _onDateTo(e: Event) {
    this.dateTo = (e.target as HTMLInputElement).value.replace("T", " ") + ":00";
    this.page = 1;
    this._fetchArticles();
  }

  private _clearDates() {
    this.dateFrom = "";
    this.dateTo = "";
    this.page = 1;
    this._fetchArticles();
  }

  private _toggleTag(tag: string) {
    const next = new Set(this.selectedTags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    this.selectedTags = next;
    this.page = 1;
    this._fetchArticles();
  }

  private _goPage(p: number) {
    if (p < 1 || p > this._totalPages) return;
    this.page = p;
    this._fetchArticles();
  }

  // ── Computed ─────────────────────────────────────────────
  private get _totalPages() {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private _pageNumbers(): number[] {
    const total = this._totalPages;
    const cur = this.page;
    const delta = 2;
    const pages: number[] = [];
    for (
      let i = Math.max(1, cur - delta);
      i <= Math.min(total, cur + delta);
      i++
    )
      pages.push(i);
    return pages;
  }

  // ── Render helpers ───────────────────────────────────────
  private _renderTags() {
    // Split tags into two rows (by index chunks)
    const chunkSize = Math.ceil(this.allTags.length / 2);
    const rows = [0, 1].map((i) =>
      this.allTags.slice(i * chunkSize, (i + 1) * chunkSize),
    );

    return html`
      <div class="tag-rows">
        ${rows.map(
      (row) => html`
            <div class="tag-row">
              ${row.map(
        (t) => html`
                  <button
                    class="badge badge-md cursor-pointer select-none transition-all
                      ${this.selectedTags.has(t.id)
            ? "badge-primary"
            : "badge-ghost border border-base-content/20 hover:badge-outline"}"
                    @click=${() => this._toggleTag(t.id)}
                  >
                    ${t.name}
                    <span class="ml-1 opacity-50 text-xs">${t.count}</span>
                  </button>
                `,
      )}
            </div>
          `,
    )}
      </div>
    `;
  }

  private _renderPagination() {
    const pages = this._pageNumbers();
    const total = this._totalPages;
    return html`
      <div class="pagination-bar">
        <span class="pagination-info text-sm text-base-content/60">
          共 <b>${this.total}</b> 篇 &nbsp;·&nbsp; 第 <b>${this.page}</b>/<b
            >${total}</b
          >
          页
        </span>
        <div class="join">
          <button
            class="join-item btn btn-sm"
            ?disabled=${this.page <= 1}
            @click=${() => this._goPage(1)}
          >
            «
          </button>
          <button
            class="join-item btn btn-sm"
            ?disabled=${this.page <= 1}
            @click=${() => this._goPage(this.page - 1)}
          >
            ‹
          </button>
          ${pages[0] > 1
        ? html`<button class="join-item btn btn-sm btn-disabled">…</button>`
        : ""}
          ${pages.map(
          (p) => html`
              <button
                class="join-item btn btn-sm ${p === this.page
              ? "btn-primary"
              : ""}"
                @click=${() => this._goPage(p)}
              >
                ${p}
              </button>
            `,
        )}
          ${pages[pages.length - 1] < total
        ? html`<button class="join-item btn btn-sm btn-disabled">…</button>`
        : ""}
          <button
            class="join-item btn btn-sm"
            ?disabled=${this.page >= total}
            @click=${() => this._goPage(this.page + 1)}
          >
            ›
          </button>
          <button
            class="join-item btn btn-sm"
            ?disabled=${this.page >= total}
            @click=${() => this._goPage(total)}
          >
            »
          </button>
        </div>
      </div>
    `;
  }

  protected renderContent(): unknown {
    return html`
      <admin-header></admin-header>
      <div class="page-root">
        <!-- ── HEADER ────────────────────────────────────── -->
        <header class="page-header card bg-base-100 shadow-sm">
          <!-- Row 1: search + date range -->
          <div class="header-row-1">
            <!-- Search form (button triggers search) -->
            <form class="search-form" @submit=${this._onSearch}>
              <label
                class="input input-bordered flex items-center gap-2 flex-1 min-w-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 shrink-0 opacity-50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  class="grow"
                  placeholder="搜索文章标题…"
                  .value=${this.keyword}
                  @input=${this._onKeywordInput}
                />
              </label>
              <button type="submit" class="btn btn-primary shrink-0">
                搜索
              </button>
            </form>

            <!-- Date range -->
            <div class="date-range">

              <input @click="${() => this.dateIntervalType = 'createdAt'}" type="radio" name="radio-1" class="radio radio-primary radio-xs" checked="checked" /><p>creator</p>
              <input @click="${() => this.dateIntervalType = 'updatedAt'}" type="radio" name="radio-1" class="radio radio-primary radio-xs" /><p>modifier</p>

              <input
                type="datetime-local"
                class="input input-bordered input-sm w-36"
                .value=${this.dateFrom}
                @change=${this._onDateFrom}
                placeholder="开始日期"
              />
              <span class="text-base-content/40 text-sm">—</span>
              <input
                type="datetime-local"
                class="input input-bordered input-sm w-36"
                .value=${this.dateTo}
                @change=${this._onDateTo}
                placeholder="结束日期"
              />
              ${this.dateFrom || this.dateTo
        ? html`
                    <button
                      class="btn btn-ghost btn-sm btn-circle"
                      title="清除时间筛选"
                      @click=${this._clearDates}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  `
        : ""}
            </div>

            <div>
              <button @click=${() => this.showUploadModal = true} class="btn btn-primary">
                上传文章
              </button>
            </div>
          </div>

          <!-- Row 2–4: tag rows -->
          <div class="header-tags">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-xs font-medium text-base-content/50 uppercase tracking-wider"
              >
                标签筛选
              </span>
              ${this.selectedTags.size
        ? html`
                    <button
                      class="btn btn-ghost btn-xs text-error"
                      @click=${() => {
            this.selectedTags = new Set();
            this.page = 1;
            this._fetchArticles();
          }}
                    >
                      清除全部
                    </button>
                  `
        : ""}
            </div>
            <div class="grid grid-cols-[5fr_1fr] gap-2">
              <div class="">
                ${this._renderTags()}
              </div>
              <div class="flex items-center justify-center">
                <button @click=${() => this.showTagEditModal = true} class="btn btn-primary">标签编辑</button>
              </div>
            </div>
          </div>
          
        </header>

        <!-- ── BODY ──────────────────────────────────────── -->
        <div class="page-body">
          <!-- Left sidebar: slot for user content -->
          <aside class="body-left card bg-base-100 shadow-sm p-4">
            <sidebar-stats slot="sidebar" apiBase="/api"></sidebar-stats>
          </aside>

          <!-- Right: dynamic table slot -->
          <main class="body-right card bg-base-100 shadow-sm">
            ${this.loading
        ? html`
                  <div class="flex items-center justify-center h-48">
                    <span
                      class="loading loading-spinner loading-lg text-primary"
                    ></span>
                  </div>
                `
        // : this.error1
        //   ? html`
        //       <div class="alert alert-error m-4">
        //         <svg
        //           xmlns="http://www.w3.org/2000/svg"
        //           class="h-5 w-5 shrink-0"
        //           fill="none"
        //           viewBox="0 0 24 24"
        //           stroke="currentColor"
        //         >
        //           <path
        //             stroke-linecap="round"
        //             stroke-linejoin="round"
        //             stroke-width="2"
        //             d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        //           />
        //         </svg>
        //         <span>${this.error1}</span>
        //         <button
        //           class="btn btn-sm btn-ghost"
        //           @click=${this._fetchArticles}
        //         >
        //           重试
        //         </button>
        //       </div>
        //     `
        : html`
                    <!-- <slot name="table" .articles=${this.articles}>
                      <div
                        class="p-4 text-base-content/30 text-sm text-center py-8 select-none"
                      >
                        请通过 slot="table" 传入自定义表格组件
                      </div>
                    </slot> -->
                    <article-table .articles=${this.articles}></article-table>
                  `}
          </main>
        </div>

        <!-- ── FOOTER ────────────────────────────────────── -->
        <footer class="page-footer card bg-base-100 shadow-sm">
          ${this._renderPagination()}
        </footer>
      </div>

      <admin-article-modal
        ?isOpen=${this.showUploadModal}
        @modal-closed=${() => this.showUploadModal = false}
      ></admin-article-modal>

      ${this.showTagEditModal ? html`<tag-edit-modal ?isOpen=${this.showTagEditModal} @modal-closed=${() => this.showTagEditModal = false}></tag-edit-modal>` : nothing}
    `;
  }

  // ── Styles ───────────────────────────────────────────────
  static defaultStyles = css`
    :host {
      display: block;
      font-family: "LXGW WenKai", "Noto Serif SC", serif;
    }

    /* ── Layout ── */
    .page-root {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      min-height: 100vh;
      box-sizing: border-box;
      max-width: 1600px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .page-header {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .header-row-1 {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .search-form {
      display: flex;
      gap: 0.5rem;
      flex: 1 1 280px;
      min-width: 0;
    }

    .date-range {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .header-tags {
      padding-top: 0.25rem;
    }

    .tag-rows {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    /* ── Body ── */
    .page-body {
      display: grid;
      grid-template-columns: 2.5fr 7.5fr;
      gap: 1rem;
      flex: 1;
    }

    .body-left {
      min-width: 0;
    }

    .body-right {
      min-width: 0;
      overflow-x: auto;
    }

    /* ── Footer ── */
    .page-footer {
      padding: 0.75rem 1.25rem;
    }

    .pagination-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    /* ── Responsive ── */

    /* Tablet ≤ 900px: stack body vertically */
    @media (max-width: 900px) {
      .page-body {
        grid-template-columns: 1fr;
      }
    }

    /* Mobile ≤ 600px: tighten padding */
    @media (max-width: 600px) {
      .page-root {
        padding: 0.5rem;
        gap: 0.625rem;
      }
      .page-header {
        padding: 0.75rem;
      }
      .header-row-1 {
        flex-direction: column;
        align-items: stretch;
      }
      .date-range {
        justify-content: flex-start;
      }
      .search-form {
        flex: 1 1 100%;
      }
      .pagination-info {
        display: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "article-page": ArticlePage;
  }
}
