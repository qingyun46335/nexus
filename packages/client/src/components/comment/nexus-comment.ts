// ============================================================
// nexus-comment.ts — 主评论组件
// 用法：<nexus-comment article-id="42" top-page-size="10" sub-page-size="5"></nexus-comment>
// 监听事件：comment-submit (payload: CommentSubmitPayload)
// 公开方法：addTopComment(c: NewTopComment) / addSubComment(c: NewSubComment) / submitError()
// ============================================================

import { html, css, nothing, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import {
  type TopComment,
  type SubComment,
  type PagedResult,
  type CommentSubmitPayload,
  type NewTopComment,
  type NewSubComment,
  type GuestInfo,
  applyEmoji,
  formatTime,
  getAvatarText,
  getAvatarColor,
} from '../../type/comment-types'
import { DaisyUIElement } from '../daisy-ui-element'

// ─── 子组件：子楼评论列表（带独立分页） ───────────────────────────────────────
@customElement('nexus-sub-comments')
export class NexusSubComments extends DaisyUIElement {
  static defaultStyles = css`
    :host { display: block; }

    .sub-comment {
      display: flex;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      margin-top: 0.5rem;
      border-radius: 0.5rem;
      background: var(--fallback-b2, oklch(var(--b2)));
      transition: background 0.15s;
    }

    .sub-comment.deleted {
      opacity: 0.5;
    }

    .sub-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .avatar {
      flex-shrink: 0;
      border-radius: 9999px;
      object-fit: cover;
    }

    .avatar-md { width: 2.5rem; height: 2.5rem; }
    .avatar-sm { width: 2rem; height: 2rem; }
    .avatar-xs { width: 1.5rem; height: 1.5rem; }

    .reply-btn {
      align-self: flex-start;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
      padding: 0.125rem 0;
      transition: color 0.15s;
    }

    .reply-btn:hover {
      color: var(--fallback-p, oklch(var(--p)));
    }
  `

  @property({ type: String, attribute: 'parent-id' }) parentId = ""
  @property({ type: Number, attribute: 'reply-count' }) replyCount = 0
  @property({ type: Number, attribute: 'page-size' }) pageSize = 5
  @property({ type: Array }) initialReplies: SubComment[] = []

  @state() private _replies: SubComment[] = []
  @state() private _page = 1
  @state() private _total = 0
  @state() private _loading = false
  @state() private _expanded = false

  private _initialized = false

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (!this._initialized && changed.has('initialReplies')) {
      this._replies = [...this.initialReplies]
      this._total = this.replyCount
      // initialReplies 有内容时直接展开
      if (this.initialReplies.length > 0) {
        this._expanded = true
      }
      this._initialized = true
    }
  }

  // 父组件追加新子评论后调用
  appendReply(c: SubComment) {
    this._replies = [c, ...this._replies]
    this._total += 1
    this._expanded = true
  }

  private get _totalPages() {
    return Math.ceil(this._total / this.pageSize)
  }

  private async _loadReplies(page: number) {
    this._loading = true
    this.dispatchEvent(new CustomEvent('load-sub-page', {
      detail: { parentId: this.parentId, page, pageSize: this.pageSize },
      bubbles: true, composed: true,
    }))
  }

  // 父组件拿到数据后调用此方法填充
  setRepliesPage(result: PagedResult<SubComment>) {
    this._replies = result.items
    this._page = result.page
    this._total = result.total
    this._loading = false
    this._expanded = true
  }

  private _renderReply(r: SubComment): TemplateResult {
    const deleted = r.deleted || r.content === null
    return html`
      <div class="sub-comment ${deleted ? 'deleted' : ''}">
        <div
          style="width: 40px; height: 40px; background-color: ${getAvatarColor(r.authorName)};"
          class="avatar avatar-sm"
          alt="${r.authorName ?? '已删除'}"
          loading="lazy"
        >${getAvatarText(r.authorName)}</div>
        <div class="sub-body">
          <div class="meta">
            <span class="author">${deleted ? '[已删除]' : r.authorName}</span>
            <span>${deleted ? nothing : renderRadge(r.role)}</span>
            ${r.replyTo ? html`<span class="reply-to">回复 <b>${r.replyTo}</b></span>` : nothing}
            <span class="time">${formatTime(r.createdAt)}</span>
          </div>
          <div class="content">
            ${deleted
        ? html`<span class="deleted-text">该评论已被删除</span>`
        : html`${applyEmoji(r.content!)}`}
          </div>
          ${deleted ? nothing : html`
            <button
              class="reply-btn"
              @click=${() => this._onReply(r)}
            >回复</button>
          `}
        </div>
      </div>
    `
  }

  private _onReply(r: SubComment) {
    this.dispatchEvent(new CustomEvent('reply-to', {
      detail: {
        parentId: this.parentId, // 依然需要楼主 ID 来确定大楼归属
        replyToId: r.id,         // 👇 [新增] 传递真正的直接回复目标 ID
        replyToName: r.authorName
      },
      bubbles: true, composed: true,
    }))
  }

  render() {
    const hiddenCount = this._total - this.initialReplies.length
    const showExpandBtn = !this._expanded && hiddenCount > 0

    return html`
      ${this._expanded
        ? html`
          ${this._loading
            ? html`<div class="sub-loading"><span class="loading loading-dots loading-xs"></span></div>`
            : repeat(this._replies, r => r.id, r => this._renderReply(r))}
          ${this._totalPages > 1 ? html`
            <div class="sub-pagination">
              <button
                class="btn btn-xs btn-ghost"
                ?disabled=${this._page <= 1 || this._loading}
                @click=${() => this._loadReplies(this._page - 1)}
              >«</button>
              <span class="page-info">${this._page} / ${this._totalPages}</span>
              <button
                class="btn btn-xs btn-ghost"
                ?disabled=${this._page >= this._totalPages || this._loading}
                @click=${() => this._loadReplies(this._page + 1)}
              >»</button>
            </div>
          ` : nothing}
        `
        : nothing}
      ${showExpandBtn ? html`
        <button
          class="expand-btn"
          @click=${() => this._loadReplies(1)}
        >
          查看全部 ${this._total} 条回复 ›
        </button>
      ` : nothing}
    `
  }
}


// ─── 主组件 ──────────────────────────────────────────────────────────────────
@customElement('nexus-comment')
export class NexusComment extends DaisyUIElement {
  // ── Attributes ──
  @property({ type: Number, attribute: 'article-id' }) articleId = 0
  @property({ type: Number, attribute: 'top-page-size' }) topPageSize = 10
  @property({ type: Number, attribute: 'sub-page-size' }) subPageSize = 5

  // ── State ──
  @state() private _comments: TopComment[] = []
  @state() private _page = 1
  @state() private _total = 0
  @state() private _topLoading = false

  // 游客信息
  @state() private _guest: GuestInfo | null = null
  @state() private _showGuestForm = false
  @state() private _guestName = ''
  @state() private _guestEmail = ''
  @state() private _guestErrors: { name?: string; email?: string } = {}

  // 评论输入
  @state() private _content = ''
  @state() private _contentError = ''
  @state() private _submitting = false

  // 回复目标
  @state() private _replyTarget: { parentId: string; replyToId: string; replyToName: string } | null = null

  // 子楼 loading map：parentId → boolean
  @state() private _subLoadingMap: Map<string, boolean> = new Map()

  // ── Lifecycle ──
  connectedCallback() {
    super.connectedCallback()
    this._loadGuest()
    this._loadTopComments(1)
  }

  // ── 公开方法（父组件调用） ──
  addTopComment(c: NewTopComment) {
    this._comments = [c, ...this._comments]
    this._total += 1
    this._submitting = false
    this._content = ''
    this._replyTarget = null
  }

  addSubComment(c: NewSubComment) {
    const subEl = this.shadowRoot?.querySelector<NexusSubComments>(
      `nexus-sub-comments[parent-id="${c.parentId}"]`
    )
    subEl?.appendReply(c)
    this._submitting = false
    this._content = ''
    this._replyTarget = null
  }

  submitError() {
    this._submitting = false
  }

  // ── 私有方法 ──
  private _loadGuest() {
    try {
      const raw = localStorage.getItem('nexus_guest')
      if (raw) this._guest = JSON.parse(raw)
    } catch { /* ignore */ }
  }

  private _saveGuest() {
    const nameVal = this._guestName.trim()
    const emailVal = this._guestEmail.trim()
    const errors: typeof this._guestErrors = {}
    if (!nameVal) errors.name = '昵称不能为空'
    else if (nameVal.length > 30) errors.name = '昵称最多 30 字'
    if (!emailVal) errors.email = '邮箱不能为空'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) errors.email = '邮箱格式不正确'
    this._guestErrors = errors
    if (Object.keys(errors).length > 0) return
    this._guest = { name: nameVal, email: emailVal }
    localStorage.setItem('nexus_guest', JSON.stringify(this._guest))
    this._showGuestForm = false
  }

  private _resetGuest() {
    this._guest = null
    localStorage.removeItem('nexus_guest')
    this._showGuestForm = true
    this._guestName = ''
    this._guestEmail = ''
    this._guestErrors = {}
  }

  private get _totalPages() {
    return Math.ceil(this._total / this.topPageSize)
  }

  private _loadTopComments(page: number) {
    this._topLoading = true
    this.dispatchEvent(new CustomEvent('load-top-page', {
      detail: { articleId: this.articleId, page, pageSize: this.topPageSize },
      bubbles: true, composed: true,
    }))
  }

  // 父组件拿到顶楼分页数据后调用
  setTopPage(result: PagedResult<TopComment>) {
    this._comments = result.items
    this._page = result.page
    this._total = result.total
    this._topLoading = false
    // 为每条评论将 replies 填充到 sub-page-size 以内
    this._comments.forEach(c => {
      if (c.replies.length > this.subPageSize) {
        c.replies = c.replies.slice(0, this.subPageSize)
      }
    })
  }

  private _validateContent(): boolean {
    const v = this._content.trim()
    if (!v) { this._contentError = '评论内容不能为空'; return false }
    if (v.length > 500) { this._contentError = `评论最多 500 字，当前 ${v.length} 字`; return false }
    this._contentError = ''
    return true
  }

  private _submit() {
    if (!this._guest) { this._showGuestForm = true; return }
    if (!this._validateContent()) return
    this._submitting = true

    // 👇 [修改] 组装 payload 时带上 replyToId
    const payload: CommentSubmitPayload = {
      content: this._content.trim(),
      authorName: this._guest.name,
      authorEmail: this._guest.email,
      ...(this._replyTarget
        ? {
          parentId: this._replyTarget.parentId,
          replyToId: this._replyTarget.replyToId,
          replyToName: this._replyTarget.replyToName
        }
        : {}),
    }

    this.dispatchEvent(new CustomEvent('comment-submit', {
      detail: payload,
      bubbles: true, composed: true,
    }))
  }

  private _cancelReply() {
    this._replyTarget = null
  }

  // ── 事件处理（子组件冒泡） ──
  private _onReplyTo(e: CustomEvent) {
    e.stopPropagation()
    const { parentId, replyToId, replyToName } = e.detail
    this._replyTarget = { parentId, replyToId, replyToName }
    this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea.comment-input')?.focus()
  }

  private _onLoadSubPage(e: CustomEvent) {
    e.stopPropagation()
    const { parentId, page, pageSize } = e.detail
    const map = new Map(this._subLoadingMap)
    map.set(parentId, true)
    this._subLoadingMap = map
    this.dispatchEvent(new CustomEvent('load-sub-page', {
      detail: { parentId, page, pageSize },
      bubbles: true, composed: true,
    }))
  }

  // 父组件拿到子楼分页数据后调用
  setSubPage(parentId: string, result: PagedResult<SubComment>) {
    const subEls = this.shadowRoot?.querySelectorAll<NexusSubComments>('nexus-sub-comments')
    const subEl = Array.from(subEls || []).find(el => el.parentId === parentId)

    subEl?.setRepliesPage(result)

    const map = new Map(this._subLoadingMap)
    map.delete(parentId)
    this._subLoadingMap = map
  }

  // ── 渲染 ──
  private _renderGuestBadge() {
    if (!this._guest) return nothing
    return html`
      <div class="guest-badge">
        <div style="width: 40px; height: 40px; background-color: ${getAvatarColor(this._guest.name)};" class="avatar avatar-xs" alt="${this._guest.name}" >${getAvatarText(this._guest.name)}</div>
        <span>你好，<b>${this._guest.name}</b></span>
        <button class="btn btn-xs btn-ghost change-btn" @click=${this._resetGuest}>修改</button>
      </div>
    `
  }

  private _renderGuestForm() {
    if (!this._showGuestForm) return nothing
    return html`
      <div class="guest-form card bg-base-200">
        <div class="card-body p-4 gap-3">
          <h3 class="font-semibold text-sm text-base-content/70">留下你的信息</h3>
          <div class="field-group">
            <label class="label-sm">昵称 *</label>
            <input
              type="text"
              class="input input-sm input-bordered w-full ${this._guestErrors.name ? 'input-error' : ''}"
              placeholder="你叫什么名字？"
              maxlength="30"
              .value=${this._guestName}
              @input=${(e: InputEvent) => this._guestName = (e.target as HTMLInputElement).value}
            />
            ${this._guestErrors.name
        ? html`<p class="text-error text-xs mt-1">${this._guestErrors.name}</p>`
        : nothing}
          </div>
          <div class="field-group">
            <label class="label-sm">邮箱 *</label>
            <input
              type="email"
              class="input input-sm input-bordered w-full ${this._guestErrors.email ? 'input-error' : ''}"
              placeholder="用于生成头像，不会公开显示"
              .value=${this._guestEmail}
              @input=${(e: InputEvent) => this._guestEmail = (e.target as HTMLInputElement).value}
            />
            ${this._guestErrors.email
        ? html`<p class="text-error text-xs mt-1">${this._guestErrors.email}</p>`
        : nothing}
          </div>
          <div class="flex gap-2 justify-end">
            ${this._guest
        ? html`<button class="btn btn-sm btn-ghost" @click=${() => { this._showGuestForm = false }}>取消</button>`
        : nothing}
            <button class="btn btn-sm btn-primary" @click=${this._saveGuest}>确认</button>
          </div>
        </div>
      </div>
    `
  }

  private _renderComposer() {
    const charCount = this._content.length
    const overLimit = charCount > 500
    return html`
      <div class="composer card bg-base-100 shadow-sm">
        <div class="card-body p-4 gap-3">
          ${this._renderGuestBadge()}
          ${this._renderGuestForm()}
          ${this._guest ? html`
            ${this._replyTarget ? html`
              <div class="reply-hint">
                <span>正在回复 <b>${this._replyTarget.replyToName}</b></span>
                <button class="btn btn-xs btn-ghost" @click=${this._cancelReply}>✕ 取消</button>
              </div>
            ` : nothing}
            <textarea
              class="textarea textarea-bordered comment-input ${this._contentError ? 'textarea-error' : ''}"
              placeholder="${this._replyTarget
          ? `回复 ${this._replyTarget.replyToName}…`
          : '说点什么吧…（支持 :) :D <3 等表情符号）'}"
              rows="4"
              maxlength="520"
              .value=${this._content}
              @input=${(e: InputEvent) => {
          this._content = (e.target as HTMLTextAreaElement).value
          if (this._contentError) this._validateContent()
        }}
            ></textarea>
            <div class="composer-footer">
              <span class="char-count ${overLimit ? 'over' : ''}">${charCount}/500</span>
              ${this._contentError
          ? html`<span class="text-error text-xs">${this._contentError}</span>`
          : nothing}
              <button
                class="btn btn-sm btn-primary ml-auto"
                ?disabled=${this._submitting}
                @click=${this._submit}
              >
                ${this._submitting
          ? html`<span class="loading loading-spinner loading-xs"></span> 发送中…`
          : '发表评论'}
              </button>
            </div>
          ` : html`
            <button class="btn btn-sm btn-outline btn-primary w-full" @click=${() => { this._showGuestForm = true }}>
              填写信息后参与讨论
            </button>
          `}
        </div>
      </div>
    `
  }

  private _renderTopComment(c: TopComment): TemplateResult {
    const deleted = c.deleted || c.content === null
    return html`
      <div class="top-comment">
        <div
          style="width: 40px; height: 40px; background-color: ${getAvatarColor(c.authorName)};"
          class="avatar avatar-md"
          alt="${c.authorName ?? '已删除'}"
          loading="lazy"
        >${getAvatarText(c.authorName)}</div>
        <div class="top-body">
          <div class="meta">
            <span class="author">${deleted ? '[已删除]' : c.authorName}</span>
            <span>${deleted ? nothing : renderRadge(c.role)}</span>
            <span class="time">${formatTime(c.createdAt)}</span>
          </div>
          <div class="content">
            ${deleted
        ? html`<span class="deleted-text">该评论已被删除</span>`
        : html`${applyEmoji(c.content!)}`}
          </div>
          ${deleted ? nothing : html`
            <button
              class="reply-btn"
              @click=${() => {
          // 👇 [修改] 顶楼点击回复时，目标 ID 就是楼主的 ID
          this._replyTarget = {
            parentId: c.id,
            replyToId: c.id,
            replyToName: c.authorName!
          }
          this.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea.comment-input')?.focus()
        }}
            >回复</button>
          `}
          <nexus-sub-comments
            parent-id="${c.id}"
            reply-count="${c.replyCount}"
            page-size="${this.subPageSize}"
            .initialReplies=${c.replies}
            @reply-to=${this._onReplyTo}
            @load-sub-page=${this._onLoadSubPage}
          ></nexus-sub-comments>
        </div>
      </div>
    `
  }

  private _renderPagination() {
    if (this._totalPages <= 1) return nothing
    const pages = buildPageList(this._page, this._totalPages)
    return html`
      <div class="pagination">
        <button
          class="btn btn-sm btn-ghost"
          ?disabled=${this._page <= 1 || this._topLoading}
          @click=${() => this._loadTopComments(this._page - 1)}
        >«</button>
        ${pages.map(p => p === '…'
      ? html`<span class="page-ellipsis">…</span>`
      : html`
            <button
              class="btn btn-sm ${this._page === p ? 'btn-primary' : 'btn-ghost'}"
              ?disabled=${this._topLoading}
              @click=${() => this._loadTopComments(p as number)}
            >${p}</button>
          `
    )}
        <button
          class="btn btn-sm btn-ghost"
          ?disabled=${this._page >= this._totalPages || this._topLoading}
          @click=${() => this._loadTopComments(this._page + 1)}
        >»</button>
      </div>
    `
  }

  render() {
    return html`
      <section class="nexus-comment">
        <!-- <h2 class="section-title">
          <span>评论</span>
          ${this._total > 0 ? html`<span class="count-badge">${this._total}</span>` : nothing}
        </h2> -->

        ${this._renderComposer()}

        <div class="comment-list">
          ${this._topLoading
        ? html`
              <div class="top-loading">
                <span class="loading loading-dots loading-md"></span>
              </div>
            `
        : this._comments.length === 0
          ? html`<div class="empty-state">还没有评论，来抢沙发吧 🛋️</div>`
          : repeat(this._comments, c => c.id, c => this._renderTopComment(c))}
        </div>

        ${this._renderPagination()}
      </section>
    `
  }

  // ── Styles ──
  static defaultStyles = css`
    /* ── 基础 reset ── */
    :host {
      display: block;
      font-family: inherit;
      color: inherit;
    }

    * { box-sizing: border-box; }

    /* ── 区块标题 ── */
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1.25rem;
      color: var(--fallback-bc, oklch(var(--bc)));
    }

    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 0.375rem;
      border-radius: 9999px;
      background: var(--fallback-p, oklch(var(--p)));
      color: var(--fallback-pc, oklch(var(--pc)));
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
    }

    /* ── 评论区整体 ── */
    .nexus-comment {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── 游客信息标牌 ── */
    .guest-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.7));
    }

    .guest-badge b {
      color: var(--fallback-bc, oklch(var(--bc)));
    }

    .change-btn {
      margin-left: auto;
      font-size: 0.75rem;
    }

    /* ── 游客表单 ── */
    .guest-form {
      border: 1px solid var(--fallback-b3, oklch(var(--b3)));
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .label-sm {
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.6));
      font-weight: 500;
    }

    /* ── 编辑器 ── */
    .composer {
      border: 1px solid var(--fallback-b3, oklch(var(--b3)));
    }

    .reply-hint {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      border-radius: 0.5rem;
      background: var(--fallback-p, oklch(var(--p) / 0.1));
      border-left: 3px solid var(--fallback-p, oklch(var(--p)));
      font-size: 0.8125rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.7));
    }

    .reply-hint b {
      color: var(--fallback-p, oklch(var(--p)));
    }

    .reply-hint button {
      margin-left: auto;
    }

    .comment-input {
      width: 100%;
      resize: vertical;
      min-height: 6rem;
      font-size: 0.9375rem;
      line-height: 1.6;
    }

    .composer-footer {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .char-count {
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
    }

    .char-count.over {
      color: var(--fallback-er, oklch(var(--er)));
      font-weight: 600;
    }

    /* ── 评论列表 ── */
    .comment-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .top-loading, .sub-loading {
      display: flex;
      justify-content: center;
      padding: 2rem 0;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
    }

    .sub-loading {
      padding: 0.75rem 0;
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem 1rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
      font-size: 0.9375rem;
    }

    /* ── 顶楼评论 ── */
    .top-comment {
      display: flex;
      gap: 0.875rem;
      padding: 1.25rem 0;
      border-bottom: 1px solid var(--fallback-b2, oklch(var(--b2)));
    }

    .top-comment:last-child {
      border-bottom: none;
    }

    .top-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    /* ── 子评论 ── */
    .sub-comment {
      display: flex;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      margin-top: 0.5rem;
      border-radius: 0.5rem;
      background: var(--fallback-b2, oklch(var(--b2)));
      transition: background 0.15s;
    }

    .sub-comment.deleted {
      opacity: 0.5;
    }

    .sub-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    /* ── meta 行 ── */
    .meta {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .author {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--fallback-bc, oklch(var(--bc)));
    }

    .reply-to {
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.5));
    }

    .reply-to b {
      color: var(--fallback-p, oklch(var(--p)));
    }

    .time {
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
      margin-left: auto;
      white-space: nowrap;
    }

    /* ── 内容 ── */
    .content {
      font-size: 0.9375rem;
      line-height: 1.7;
      color: var(--fallback-bc, oklch(var(--bc) / 0.85));
      word-break: break-word;
    }

    .deleted-text {
      font-style: italic;
      color: var(--fallback-bc, oklch(var(--bc) / 0.35));
    }

    /* ── 回复按钮 ── */
    .reply-btn {
      align-self: flex-start;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
      padding: 0.125rem 0;
      transition: color 0.15s;
    }

    .reply-btn:hover {
      color: var(--fallback-p, oklch(var(--p)));
    }

    /* ── 头像 ── */
    .avatar {
      flex-shrink: 0;
      border-radius: 9999px;
      object-fit: cover;
    }

    .avatar-md { width: 2.5rem; height: 2.5rem; }
    .avatar-sm { width: 2rem; height: 2rem; }
    .avatar-xs { width: 1.5rem; height: 1.5rem; }

    /* ── 展开按钮 ── */
    .expand-btn {
      margin-top: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--fallback-p, oklch(var(--p)));
      padding: 0.25rem 0;
      transition: opacity 0.15s;
    }

    .expand-btn:hover { opacity: 0.75; }

    /* ── 子楼分页 ── */
    .sub-pagination {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .sub-pagination .page-info {
      font-size: 0.75rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.5));
      min-width: 3rem;
      text-align: center;
    }

    /* ── 顶楼分页 ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
    }

    .page-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      font-size: 0.875rem;
      color: var(--fallback-bc, oklch(var(--bc) / 0.4));
    }

    /* ── 小屏适配 ── */
    @media (max-width: 480px) {
      .top-comment {
        gap: 0.625rem;
        padding: 1rem 0;
      }

      .avatar-md { width: 2rem; height: 2rem; }

      .content {
        font-size: 0.875rem;
      }

      .composer .card-body {
        padding: 0.75rem;
      }

      .pagination {
        gap: 0.125rem;
      }

      .meta {
        gap: 0.375rem;
      }

      .time {
        margin-left: 0;
        flex-basis: 100%;
      }
    }
  `
}



function renderRadge(role: "admin" | "guest") {
  return role === "admin" ? html`<div class="badge badge-primary">管理员</div>` : nothing
}

// ── 工具函数：生成分页数字列表（含省略号） ──
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | '…')[] = []
  const delta = 1 // 当前页两侧各显示几页
  const left = current - delta
  const right = current + delta
  let prev = 0
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      if (prev && i - prev > 1) result.push('…')
      result.push(i)
      prev = i
    }
  }
  return result
}

declare global {
  interface HTMLElementTagNameMap {
    'nexus-comment': NexusComment
    'nexus-sub-comments': NexusSubComments
  }
}
