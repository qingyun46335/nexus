import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import axios from "axios";
import { AuthLitElement } from "../../components/auth-lit-element";
import axiosi from "../../utils/axios";

import "../../components/admin-header";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FriendLink {
  id?: string;
  name: string;
  url: string;
  avatar: string;
  description: string;
  author: string;
  status: number;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  replyTo: string | null;
  replyToId: string | null;
  deleted: number;
  parentId: string | null;
  role: "admin" | "guest";
}

interface PaginatedComments {
  data: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

type CommentInfor = { authorName: string, authorEmail: string, role: "admin" | "goest" }

type Tab = "links" | "comments";
type ModalMode = "add" | "edit";

// ─── Component ───────────────────────────────────────────────────────────────

@customElement("blog-settings-page")
export class BlogSettingsPage extends AuthLitElement {
  // 把所有颜色交给 DaisyUI CSS 变量（v4 格式：--color-base-100 等）
  // Shadow DOM 可以继承这些变量，因为它们定义在 :root 上
  static defaultStyles = css`
    :host {
      display: block;
      font-family: inherit;
      color: var(--color-base-content);
    }

    /* ── Tab bar ── */
    .tab-bar {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-base-300);
    }
    .tab-btn {
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: var(--color-base-content); }
    .tab-btn.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    /* ── Section header ── */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-base-content);
    }
    .section-title span {
      color: color-mix(in oklch, var(--color-base-content) 35%, transparent);
      font-weight: 400;
      font-size: 0.85rem;
    }

    /* ── Friend link cards ── */
    .link-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .link-card {
      background: var(--color-base-200);
      border: 1px solid var(--color-base-300);
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: box-shadow 0.15s;
    }
    .link-card:hover {
      box-shadow: 0 4px 16px color-mix(in oklch, var(--color-base-content) 8%, transparent);
    }
    .link-card-top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .link-avatar {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      object-fit: cover;
      background: var(--color-base-300);
      flex-shrink: 0;
    }
    .link-avatar-placeholder {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: var(--color-base-300);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      flex-shrink: 0;
    }
    .link-meta { flex: 1; min-width: 0; }
    .link-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--color-base-content);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .link-author {
      font-size: 0.75rem;
      color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
      margin-top: 0.1rem;
    }
    .link-desc {
      font-size: 0.8rem;
      color: color-mix(in oklch, var(--color-base-content) 65%, transparent);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .link-url {
      font-size: 0.75rem;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }
    .link-url:hover { text-decoration: underline; }
    .link-card-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-base-300);
    }
    .status-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      cursor: pointer;
      border: none;
    }
    .status-visible {
      background: color-mix(in oklch, var(--color-success) 15%, transparent);
      color: var(--color-success);
    }
    .status-hidden {
      background: var(--color-base-300);
      color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
    }
    .card-btns { display: flex; gap: 0.375rem; }

    /* ── Comment toolbar ── */
    .comment-toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: color-mix(in oklch, var(--color-base-content) 40%, transparent);
      pointer-events: none;
      width: 1rem;
      height: 1rem;
    }
    .search-input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      font-size: 0.875rem;
      background: var(--color-base-200);
      border: 1px solid var(--color-base-300);
      border-radius: 0.5rem;
      color: var(--color-base-content);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .search-input:focus { border-color: var(--color-primary); }
    .search-input::placeholder {
      color: color-mix(in oklch, var(--color-base-content) 35%, transparent);
    }

    /* ── Table ── */
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--color-base-300);
      border-radius: 0.75rem;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.8375rem; }
    thead th {
      background: var(--color-base-200);
      padding: 0.65rem 0.875rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.775rem;
      color: color-mix(in oklch, var(--color-base-content) 55%, transparent);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-base-300);
    }
    tbody tr {
      border-bottom: 1px solid color-mix(in oklch, var(--color-base-300) 60%, transparent);
      transition: background 0.1s;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: color-mix(in oklch, var(--color-base-200) 50%, transparent); }
    tbody tr.deleted-row { opacity: 0.45; }
    td {
      padding: 0.75rem 0.875rem;
      vertical-align: middle;
      color: var(--color-base-content);
    }
    .td-author-name { font-weight: 500; font-size: 0.85rem; }
    .td-author-email {
      font-size: 0.7rem;
      color: color-mix(in oklch, var(--color-base-content) 45%, transparent);
      margin-top: 0.1rem;
    }
    .td-content { max-width: 300px; }
    .td-content-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.45;
    }
    .td-content-reply {
      font-size: 0.7rem;
      color: color-mix(in oklch, var(--color-base-content) 45%, transparent);
      margin-top: 0.25rem;
    }
    .td-date {
      white-space: nowrap;
      font-size: 0.775rem;
      color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
    }
    .deleted-select {
      appearance: none;
      border-radius: 0.375rem;
      padding: 0.3rem 1.75rem 0.3rem 0.6rem;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.4rem center;
      transition: border-color 0.15s;
    }
    .deleted-select:focus { outline: none; }
    .deleted-select.not-deleted {
      color: var(--color-success);
      border: 1px solid color-mix(in oklch, var(--color-success) 40%, transparent);
      background-color: color-mix(in oklch, var(--color-success) 10%, transparent);
    }
    .deleted-select.is-deleted {
      color: var(--color-error);
      border: 1px solid color-mix(in oklch, var(--color-error) 40%, transparent);
      background-color: color-mix(in oklch, var(--color-error) 10%, transparent);
    }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .pagination-info {
      font-size: 0.775rem;
      color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
    }
    .pagination-btns { display: flex; gap: 0.25rem; }
    .page-btn {
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.4rem;
      font-size: 0.8rem;
      border: 1px solid var(--color-base-300);
      border-radius: 0.375rem;
      background: var(--color-base-200);
      color: var(--color-base-content);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .page-btn:hover:not(:disabled) { background: var(--color-base-300); }
    .page-btn.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-primary-content);
    }
    .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* ── Modal overlay ── */
    /* 遮罩层渲染在 Shadow DOM 内，fixed 定位正常工作 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in oklch, black 50%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
    }
    /* modal-box 用 DaisyUI CSS 变量，不用 oklch() 拼接 */
    .custom-modal-card {
      background: var(--color-base-100);
      border: 1px solid var(--color-base-300);
      border-radius: 1rem;
      padding: 1.5rem;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px color-mix(in oklch, black 30%, transparent);
      color: var(--color-base-content);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .modal-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-base-content);
      margin: 0;
    }
    .modal-close {
      background: none;
      border: none;
      color: color-mix(in oklch, var(--color-base-content) 50%, transparent);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.375rem;
      line-height: 1;
      font-size: 1rem;
      transition: color 0.15s;
    }
    .modal-close:hover { color: var(--color-base-content); }

    /* ── Form ── */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
    }
    .form-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-field.full { grid-column: 1 / -1; }
    .form-label {
      font-size: 0.775rem;
      font-weight: 600;
      color: color-mix(in oklch, var(--color-base-content) 60%, transparent);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .form-input,
    .form-textarea,
    .form-select {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      background: var(--color-base-200);
      border: 1px solid var(--color-base-300);
      border-radius: 0.5rem;
      color: var(--color-base-content);
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus { border-color: var(--color-primary); }
    .form-input::placeholder,
    .form-textarea::placeholder {
      color: color-mix(in oklch, var(--color-base-content) 30%, transparent);
    }
    .form-textarea { resize: vertical; min-height: 80px; }
    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2rem;
      cursor: pointer;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-base-300);
    }

    /* ── Empty / loading ── */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: color-mix(in oklch, var(--color-base-content) 40%, transparent);
      font-size: 0.875rem;
    }
    .empty-icon { font-size: 2.25rem; margin-bottom: 0.5rem; }
    .loading-wrap { display: flex; justify-content: center; padding: 3rem; }

    /* ── Toast ── */
    .toast-wrap {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .toast {
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: #fff;
      box-shadow: 0 4px 16px color-mix(in oklch, black 20%, transparent);
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(1rem); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast.success { background: var(--color-success); color: var(--color-success-content); }
    .toast.error   { background: var(--color-error);   color: var(--color-error-content); }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
      .form-field.full { grid-column: 1; }
      .custom-modal-card { padding: 1.125rem; border-radius: 0.75rem; }
      .link-grid { grid-template-columns: 1fr; }
      .section-header { flex-direction: column; align-items: flex-start; }
      .pagination { flex-direction: column; align-items: flex-start; }
      .comment-toolbar { flex-direction: column; align-items: stretch; }
      td, th { padding: 0.6rem; }
      .td-content { max-width: 160px; }
    }
  `;

  // ── State ──────────────────────────────────────────────────────────────────

  @state() private activeTab: Tab = "comments";

  @state() private links: FriendLink[] = [];
  @state() private linksLoading = false;
  @state() private linkModalOpen = false;
  @state() private linkModalMode: ModalMode = "add";
  @state() private editingLink: FriendLink = this._emptyLink();
  @state() private linkSaving = false;

  @state() private comments: Comment[] = [];
  @state() private commentsLoading = false;
  @state() private commentTotal = 0;
  @state() private commentPage = 1;
  @state() private commentPageSize = 15;
  @state() private commentSearch = "";
  @state() private commentModalOpen = false;
  @state() private newComment = { content: "", authorName: "", authorEmail: "", replyToId: "", replyTo: "", role: "goest" };
  @state() private commentSaving = false;

  @state() private toasts: Array<{ id: number; msg: string; type: "success" | "error" }> = [];
  private _toastCounter = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();
    this.loadingCommentInfor()
    this._loadComments()
  }

  loadingCommentInfor() {
    const inforString = window.localStorage.getItem("commentInfor")
    if (inforString) {
      const infor = JSON.parse(inforString) as CommentInfor
      this.newComment = { ...this.newComment, authorName: infor.authorName, authorEmail: infor.authorEmail, role: infor.role }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _emptyLink(): FriendLink {
    return { name: "", url: "", avatar: "", description: "", author: "", status: 1 };
  }

  private _toast(msg: string, type: "success" | "error" = "success") {
    const id = ++this._toastCounter;
    this.toasts = [...this.toasts, { id, msg, type }];
    setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id); }, 3000);
  }

  private _formatDate(iso: string) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  // ── API: Friend Links ──────────────────────────────────────────────────────

  private async _loadLinks() {
    this.linksLoading = true;
    try {
      const { data } = await axiosi.get("/admin/about/getFriends");
      this.links = data.value;
    } catch { this._toast("加载友链失败", "error"); }
    finally { this.linksLoading = false; }
  }

  private _openAddLink() {
    this.linkModalMode = "add";
    this.editingLink = this._emptyLink();
    this.linkModalOpen = true;
  }

  private _openEditLink(link: FriendLink) {
    this.linkModalMode = "edit";
    this.editingLink = { ...link };
    this.linkModalOpen = true;
  }

  private async _saveLink() {
    const { name, url, description, author } = this.editingLink;
    if (!name || !url || !description || !author) { this._toast("请填写所有必填字段", "error"); return; }
    this.linkSaving = true;
    try {
      if (this.linkModalMode === "add") {
        const form = new FormData()
        form.append("friend", JSON.stringify(this.editingLink))
        const { data } = await axiosi.post("/admin/about/addFriend", form);
        this.links = [...this.links, data];
        this._toast("友链已添加");
      } else {
        const form = new FormData()
        form.append("id", String(this.editingLink.id))
        form.append("friend", JSON.stringify(this.editingLink))
        const { data } = await axiosi.post(`/admin/about/updFriend`, form);
        this.links = this.links.map((l) => (l.id === data.id ? data : l));
        this._toast("友链已更新");
      }
      this.linkModalOpen = false;
    } catch { this._toast("保存失败，请重试", "error"); }
    finally { this.linkSaving = false; }
  }

  private async _deleteLink(id: string) {
    if (!confirm("确认删除这条友链？")) return;
    try {
      await axiosi.get(`/admin/about/delFriend?id=${id}`);
      this.links = this.links.filter((l) => l.id !== id);
      this._toast("友链已删除");
    } catch { this._toast("删除失败", "error"); }
  }

  private async _toggleLinkStatus(link: FriendLink) {
    const updated = { ...link, status: link.status === 1 ? 0 : 1 };
    try {
      const form = new FormData()
      form.append("id", String(link.id))
      form.append("friend", JSON.stringify(updated))
      const { data } = await axiosi.post(`/admin/about/updFriend`, form);
      this.links = this.links.map((l) => (l.id === data.id ? data : l));
    } catch { this._toast("状态更新失败", "error"); }
  }

  // ── API: Comments ──────────────────────────────────────────────────────────

  private async _loadComments() {
    this.commentsLoading = true;
    try {
      const { data } = await axiosi.get<{ value: PaginatedComments }>("/admin/comment/getComments", {
        params: { page: this.commentPage, pageSize: this.commentPageSize, q: this.commentSearch || undefined },
      });
      this.comments = data.value.data;
      this.commentTotal = data.value.total;
    } catch { this._toast("加载评论失败", "error"); }
    finally { this.commentsLoading = false; }
  }

  private _switchTab(tab: Tab) {
    this.activeTab = tab;
    if (tab === "comments" && this.comments.length === 0) {
      this._loadComments()
    } else if (tab === "links") {
      this._loadLinks()
    }
  }

  private _onSearchInput(e: Event) {
    this.commentSearch = (e.target as HTMLInputElement).value;
  }

  private _onSearchKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") { this.commentPage = 1; this._loadComments(); }
  }

  private _goToPage(page: number) {
    this.commentPage = page;
    this._loadComments();
  }

  private async _setCommentDeleted(id: string, deleted: number) {
    try {
      const form = new FormData()
      form.append("id", String(id))
      form.append("c", JSON.stringify({ deleted }))
      await axiosi.post(`/admin/comment/updComment`, form);
      this.comments = this.comments.map((c) => (c.id === id ? { ...c, deleted } : c));
    } catch { this._toast("状态更新失败", "error"); }
  }

  private async _submitComment() {
    const { content, authorName, authorEmail } = this.newComment;
    if (!content || !authorName || !authorEmail) { this._toast("请填写必填字段", "error"); return; }
    this.commentSaving = true;
    try {
      const form = new FormData()
      form.append("c", JSON.stringify(this.newComment))
      await axiosi.post("/admin/comment/addComment", form);
      window.localStorage.setItem("commentInfor", JSON.stringify({ authorName: this.newComment.authorName, authorEmail: this.newComment.authorEmail, role: this.newComment.role }))
      this._toast("评论已发布");
      this.commentModalOpen = false;
      this.newComment = { content: "", authorName: "", authorEmail: "", replyToId: "", replyTo: "", role: "guest" };
      this.commentPage = 1;
      this._loadComments();
    } catch { this._toast("发布失败", "error"); }
    finally { this.commentSaving = false; }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  private _renderLinks() {
    if (this.linksLoading) {
      return html`<div class="loading-wrap"><span class="loading loading-spinner loading-md"></span></div>`;
    }
    return html`
      <div class="section-header">
        <h2 class="section-title">友情链接 <span>(${this.links.length})</span></h2>
        <button class="btn btn-primary btn-sm" @click=${this._openAddLink}>+ 添加友链</button>
      </div>
      ${this.links.length === 0
        ? html`<div class="empty-state"><div class="empty-icon">🔗</div><div>暂无友链，添加第一个吧</div></div>`
        : html`<div class="link-grid">${this.links.map((l) => this._renderLinkCard(l))}</div>`}
    `;
  }

  private _renderLinkCard(l: FriendLink) {
    return html`
      <div class="link-card">
        <div class="link-card-top">
          ${l.avatar
        ? html`<img class="link-avatar" src=${l.avatar} alt=${l.name}
                @error=${(e: Event) => { (e.target as HTMLImageElement).style.display = "none"; }} />`
        : html`<div class="link-avatar-placeholder">🔗</div>`}
          <div class="link-meta">
            <div class="link-name">${l.name}</div>
            <div class="link-author">by ${l.author}</div>
          </div>
        </div>
        <div class="link-desc">${l.description}</div>
        <a class="link-url" href=${l.url} target="_blank" rel="noopener">${l.url}</a>
        <div class="link-card-actions">
          <button class="status-badge ${l.status === 1 ? "status-visible" : "status-hidden"}"
            title="点击切换显示状态"
            @click=${() => this._toggleLinkStatus(l)}>
            ${l.status === 1 ? "展示中" : "已隐藏"}
          </button>
          <div class="card-btns">
            <button class="btn btn-ghost btn-xs" @click=${() => this._openEditLink(l)}>编辑</button>
            <button class="btn btn-ghost btn-xs text-error" @click=${() => this._deleteLink(l.id!)}>删除</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderLinkModal() {
    if (!this.linkModalOpen) return nothing;
    const l = this.editingLink;
    const set = (patch: Partial<FriendLink>) => { this.editingLink = { ...l, ...patch }; };
    return html`
      <div class="modal-overlay"
        @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.linkModalOpen = false; }}>
        <div class="custom-modal-card">
          <div class="modal-header">
            <h3 class="modal-title">${this.linkModalMode === "add" ? "添加友链" : "编辑友链"}</h3>
            <button class="modal-close" @click=${() => { this.linkModalOpen = false; }}>✕</button>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">站点名称 *</label>
              <input class="form-input" .value=${l.name} placeholder="某某的博客"
                @input=${(e: InputEvent) => set({ name: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field">
              <label class="form-label">作者 *</label>
              <input class="form-input" .value=${l.author} placeholder="张三"
                @input=${(e: InputEvent) => set({ author: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field full">
              <label class="form-label">站点 URL *</label>
              <input class="form-input" .value=${l.url} placeholder="https://example.com"
                @input=${(e: InputEvent) => set({ url: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field full">
              <label class="form-label">头像 URL</label>
              <input class="form-input" .value=${l.avatar} placeholder="https://example.com/avatar.png"
                @input=${(e: InputEvent) => set({ avatar: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field full">
              <label class="form-label">描述 *</label>
              <textarea class="form-textarea" .value=${l.description} placeholder="一两句话介绍这个博客"
                @input=${(e: InputEvent) => set({ description: (e.target as HTMLTextAreaElement).value })}></textarea>
            </div>
            <div class="form-field">
              <label class="form-label">显示状态</label>
              <select class="form-select" .value=${String(l.status)}
                @change=${(e: Event) => set({ status: Number((e.target as HTMLSelectElement).value) })}>
                <option value="1">展示</option>
                <option value="0">隐藏</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" @click=${() => { this.linkModalOpen = false; }}>取消</button>
            <button class="btn btn-primary btn-sm" ?disabled=${this.linkSaving} @click=${this._saveLink}>
              ${this.linkSaving ? html`<span class="loading loading-spinner loading-xs"></span>` : "保存"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderComments() {
    const totalPages = Math.max(1, Math.ceil(this.commentTotal / this.commentPageSize));
    const start = (this.commentPage - 1) * this.commentPageSize + 1;
    const end = Math.min(this.commentPage * this.commentPageSize, this.commentTotal);

    // 滑动窗口分页（最多 7 个按钮）
    const pageNums: number[] = [];
    const windowSize = Math.min(totalPages, 7);
    let winStart: number;
    if (this.commentPage <= 4) winStart = 1;
    else if (this.commentPage >= totalPages - 3) winStart = Math.max(1, totalPages - 6);
    else winStart = this.commentPage - 3;
    for (let i = 0; i < windowSize; i++) pageNums.push(winStart + i);

    return html`
      <div class="section-header">
        <h2 class="section-title">评论管理 <span>(共 ${this.commentTotal})</span></h2>
        <button class="btn btn-primary btn-sm" @click=${() => { this.commentModalOpen = true; }}>+ 发布评论</button>
      </div>
      <div class="comment-toolbar">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input class="search-input" type="search" placeholder="搜索内容或评论者昵称…"
            .value=${this.commentSearch}
            @input=${this._onSearchInput}
            @keydown=${this._onSearchKeydown} />
        </div>
        <button class="btn btn-ghost btn-sm"
          @click=${() => { this.commentPage = 1; this._loadComments(); }}>搜索</button>
      </div>

      ${this.commentsLoading
        ? html`<div class="loading-wrap"><span class="loading loading-spinner loading-md"></span></div>`
        : this._renderCommentTable()}

      <div class="pagination">
        <div class="pagination-info">
          ${this.commentTotal > 0 ? `第 ${start}–${end} 条，共 ${this.commentTotal} 条` : "暂无数据"}
        </div>
        <div class="pagination-btns">
          <button class="page-btn" ?disabled=${this.commentPage <= 1}
            @click=${() => this._goToPage(this.commentPage - 1)}>‹</button>
          ${pageNums.map((p) => html`
            <button class="page-btn ${p === this.commentPage ? "active" : ""}"
              @click=${() => this._goToPage(p)}>${p}</button>`)}
          <button class="page-btn" ?disabled=${this.commentPage >= totalPages}
            @click=${() => this._goToPage(this.commentPage + 1)}>›</button>
        </div>
      </div>
    `;
  }

  private _renderCommentTable() {
    if (this.comments.length === 0) {
      return html`<div class="empty-state"><div class="empty-icon">💬</div><div>没有找到匹配的评论</div></div>`;
    }
    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>评论者</th>
              <th>内容</th>
              <th>被回复评论id</th>
              <th>时间</th>
              <th>角色</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            ${this.comments.map((c) => html`
              <tr class=${c.deleted === 1 ? "deleted-row" : ""}>
                <td>
                  <div>
                    ${c.id}
                  </div>
                </td>
                <td>
                  <div class="td-author-name">${c.authorName}</div>
                  <div class="td-author-email">${c.authorEmail}</div>
                </td>
                <td class="td-content">
                  <div class="td-content-text">${c.content}</div>
                  ${c.replyTo ? html`<div class="td-content-reply">↩ 回复 ${c.replyTo}</div>` : nothing}
                </td>
                <td>
                  <div>
                    ${c.replyToId ? c.replyToId : "顶层评论"}
                  </div>
                </td>
                <td class="td-date">${this._formatDate(c.createdAt)}</td>
                <td>
                  <select
                    class="deleted-select ${c.role === "admin" ? "is-deleted" : "not-deleted"}"
                    .value=${String(c.role)}
                    @change=${(e: Event) =>
        this._setCommentRole(c.id, (e.target as HTMLSelectElement).value as "admin" | "guest")}>
                    <option value="admin">管理员</option>
                    <option value="guest">游客</option>
                  </select>
                </td>
                <td>
                  <select
                    class="deleted-select ${c.deleted === 1 ? "is-deleted" : "not-deleted"}"
                    .value=${String(c.deleted)}
                    @change=${(e: Event) =>
        this._setCommentDeleted(c.id, Number((e.target as HTMLSelectElement).value))}>
                    <option value="0">正常</option>
                    <option value="1">已删除</option>
                  </select>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
  private async _setCommentRole(id: string, value: "admin" | "guest") {
    try {
      const form = new FormData()
      form.append("id", String(id))
      form.append("c", JSON.stringify({ role: value }))
      await axiosi.post(`/admin/comment/updComment`, form);
      this.comments = this.comments.map((c) => (c.id === id ? { ...c, role: value } : c));
    } catch { this._toast("状态更新失败", "error"); }
  }

  private _renderCommentModal() {
    if (!this.commentModalOpen) return nothing;
    const nc = this.newComment;
    const set = (patch: Partial<typeof nc>) => { this.newComment = { ...nc, ...patch }; };
    return html`
      <div class="modal-overlay"
        @click=${(e: MouseEvent) => { if (e.target === e.currentTarget) this.commentModalOpen = false; }}>
        <div class="custom-modal-card">
          <div class="modal-header">
            <h3 class="modal-title">发布评论</h3>
            <button class="modal-close" @click=${() => { this.commentModalOpen = false; }}>✕</button>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label class="form-label">昵称 *</label>
              <input class="form-input" .value=${nc.authorName} placeholder="管理员"
                @input=${(e: InputEvent) => set({ authorName: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field">
              <label class="form-label">邮箱 *</label>
              <input class="form-input" type="email" .value=${nc.authorEmail} placeholder="admin@example.com"
                @input=${(e: InputEvent) => set({ authorEmail: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field full">
              <label class="form-label">回复目标 ID（可选）</label>
              <input class="form-input" .value=${nc.replyToId} placeholder="留空表示顶层评论"
                @input=${(e: InputEvent) => set({ replyToId: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="form-field full">
              <label class="form-label">评论内容 *</label>
              <textarea class="form-textarea" style="min-height:120px" .value=${nc.content}
                placeholder="在此输入评论内容…"
                @input=${(e: InputEvent) => set({ content: (e.target as HTMLTextAreaElement).value })}></textarea>
            </div>
            <div class="form-field full">
              <label class="form-label">角色 *</label>
              <div class="flex">
                <input @input=${(_e: InputEvent) => set({ role: "admin" })} type="radio" name="radio-1" class="radio" .checked=${nc.role === "admin"} />管理员
                <input style="margin-left: 10px;" @input=${(_e: InputEvent) => set({ role: "guest" })} type="radio" name="radio-1" class="radio" .checked=${nc.role === "guest"} />游客
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" @click=${() => { this.commentModalOpen = false; }}>取消</button>
            <button class="btn btn-primary btn-sm" ?disabled=${this.commentSaving} @click=${this._submitComment}>
              ${this.commentSaving ? html`<span class="loading loading-spinner loading-xs"></span>` : "发布"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderContent() {
    return html`
      <admin-header></admin-header>
      <div class="tab-bar">
        <button class="tab-btn ${this.activeTab === "comments" ? "active" : ""}"
          @click=${() => this._switchTab("comments")}>评论管理</button>
        <button class="tab-btn ${this.activeTab === "links" ? "active" : ""}"
          @click=${() => this._switchTab("links")}>友情链接</button>
        
      </div>

      ${this.activeTab === "links" ? this._renderLinks() : this._renderComments()}

      ${this._renderLinkModal()}
      ${this._renderCommentModal()}

      <div class="toast-wrap">
        ${this.toasts.map((t) => html`<div class="toast ${t.type}">${t.msg}</div>`)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "blog-settings-page": BlogSettingsPage;
  }
}