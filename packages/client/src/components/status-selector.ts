import { html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { DaisyUIElement } from "./daisy-ui-element";
import { truncateString } from "../utils/string_util";

export interface StatusSelectorItem {
  id: string;
  value: string;
}

export interface StatusChangeDetail {
  params: Record<string, string>;
  changed: { id: string; value: string };
}

export type StatusSelectorItems = Record<string, StatusSelectorItem>;

@customElement("status-selector")
export class StatusSelector extends DaisyUIElement {
  static defaultStyles = css`
    :host {
      display: block;
      font-family: inherit;
    }

    /* ── 容器 ─────────────────────────────────── */
    .container {
      border: 1px solid oklch(var(--b3));
      border-radius: var(--rounded-box, 0.5rem);
      overflow-y: auto;
      overflow-x: hidden;
      background-color: oklch(var(--b1));
      max-height: var(--ss-max-height, 400px);
    }

    .container::-webkit-scrollbar { width: 4px; }
    .container::-webkit-scrollbar-track { background: transparent; }
    .container::-webkit-scrollbar-thumb {
      background-color: oklch(var(--b3));
      border-radius: 9999px;
    }

    /* ── 行 ───────────────────────────────────── */
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid oklch(var(--b2));
      gap: 0.75rem;
      min-height: 3rem;
      position: relative;       /* 为浮层提供定位上下文 */
      transition: background-color 0.15s ease;
    }
    .row:last-child { border-bottom: none; }
    .row:hover { background-color: oklch(var(--b2)); }

    .row-name {
      flex: 1;
      min-width: 0;
      font-size: 0.875rem;
      color: oklch(var(--bc));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── 触发按钮 ─────────────────────────────── */
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0 0.625rem;
      height: 2rem;
      min-width: 6rem;
      max-width: 10rem;
      border-radius: var(--rounded-btn, 0.5rem);
      border: 1px solid oklch(var(--b3));
      background-color: oklch(var(--b1));
      color: oklch(var(--bc));
      font-size: 0.8rem;
      cursor: pointer;
      user-select: none;
      transition: border-color 0.15s ease, background-color 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      flex-shrink: 0;
      justify-content: space-between;
    }
    .trigger:hover {
      border-color: oklch(var(--bc) / 0.4);
      background-color: oklch(var(--b2));
    }
    .trigger.open {
      border-color: oklch(var(--p));
      box-shadow: 0 0 0 2px oklch(var(--p) / 0.2);
    }

    .trigger-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .trigger-icon {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      transition: transform 0.15s ease;
      color: oklch(var(--bc) / 0.5);
    }
    .trigger.open .trigger-icon {
      transform: rotate(180deg);
    }

    /* ── 浮层菜单 ─────────────────────────────── */
    .menu-popup {
      position: absolute;
      right: 0.75rem;
      top: calc(100% - 0.25rem);
      z-index: 50;
      min-width: 8rem;
      max-height: 12rem;
      overflow-y: auto;
      background-color: var(--color-base-300);
      border: 1px solid oklch(var(--b3));
      border-radius: var(--rounded-box, 0.5rem);
      box-shadow: 0 4px 16px oklch(var(--bc) / 0.12);
      padding: 0.25rem;
    }

    .menu-popup::-webkit-scrollbar { width: 3px; }
    .menu-popup::-webkit-scrollbar-thumb {
      background-color: var(--color-base-300);
      border-radius: 9999px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.375rem 0.625rem;
      border-radius: var(--rounded-btn, 0.375rem);
      font-size: 0.8rem;
      color: oklch(var(--bc));
      cursor: pointer;
      transition: background-color 0.1s ease;
      gap: 0.5rem;
    }
    .menu-item:hover {
      background-color: oklch(var(--b2));
    }
    .menu-item.selected {
      background-color: oklch(var(--p) / 0.12);
      color: oklch(var(--p));
      font-weight: 500;
    }

    .check-icon {
      width: 0.875rem;
      height: 0.875rem;
      flex-shrink: 0;
      color: oklch(var(--p));
    }

    /* ── 空状态 ───────────────────────────────── */
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 6rem;
      color: oklch(var(--bc) / 0.35);
      font-size: 0.875rem;
    }

    /* ── 小屏适配 ─────────────────────────────── */
    @media (max-width: 480px) {
      .row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.375rem;
        padding: 0.625rem 0.75rem;
      }
      .row-name { width: 100%; }
      .trigger {
        width: 100%;
        max-width: 100%;
      }
      .menu-popup {
        right: 0.75rem;
        left: 0.75rem;
        min-width: unset;
      }
    }
  `;

  /** 行数据：key 为显示名称，value 为 { id, value } */
  @property({ type: Object })
  items: StatusSelectorItems = {};

  /** 下拉选项列表 */
  @property({ type: Array })
  statusOptions: Record<string, string> = {}

  /** 容器最大高度，支持任意 CSS 长度值，默认 400px */
  @property({ type: String })
  maxHeight = "400px";

  /** 当前展开的行 id，null 表示全部收起 */
  @state()
  private _openId: string | null = null;

  /** 全量参数表：key 为 id，value 为当前选中状态 */
  @state()
  private _params: Record<string, string> = {};

  // ── 外部点击关闭 ────────────────────────────────
  private _outsideClickHandler = (e: MouseEvent) => {
    if (!this.shadowRoot?.contains(e.target as Node)) {
      this._openId = null;
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this._outsideClickHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this._outsideClickHandler);
  }

  // ── items 变化时同步 _params ─────────────────────
  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has("items")) {
      const next: Record<string, string> = {};
      for (const [, item] of Object.entries(this.items)) {
        next[item.id] = this._params[item.id] ?? item.value;
      }
      this._params = next;
    }
  }

  // ── 事件处理 ─────────────────────────────────────
  private _toggleMenu(id: string, e: Event) {
    e.stopPropagation();
    this._openId = this._openId === id ? null : id;
  }

  private _selectOption(id: string, opt: string, e: Event) {
    e.stopPropagation();
    this._openId = null;
    this._params = { ...this._params, [id]: opt };

    this.dispatchEvent(
      new CustomEvent<StatusChangeDetail>("status-change", {
        detail: {
          params: { ...this._params },
          changed: { id, value: opt },
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ── 渲染单行 ─────────────────────────────────────
  private _renderRow(name: string, item: StatusSelectorItem) {
    const current = this._params[item.id] ?? item.value;
    const isOpen = this._openId === item.id;

    return html`
      <div class="row">
        <span class="row-name" title=${name}>${truncateString(name, 10)}</span>

        <button
          class="trigger ${isOpen ? "open" : ""}"
          @click=${(e: Event) => this._toggleMenu(item.id, e)}
          aria-haspopup="listbox"
          aria-expanded=${isOpen}
        >
          <span class="trigger-label">${this.statusOptions[current]}</span>
          <svg class="trigger-icon" viewBox="0 0 20 20" fill="none"
               xmlns="http://www.w3.org/2000/svg">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        ${isOpen
        ? html`
            <div class="menu-popup" role="listbox">
              ${Object.entries(this.statusOptions).map(([opt, value]) => html`
                <div
                  class="menu-item ${current === opt ? "selected" : ""}"
                  role="option"
                  aria-selected=${current === opt}
                  @click=${(e: Event) => this._selectOption(item.id, opt, e)}
                >
                  <span>${value}</span>
                  ${current === opt
            ? html`
                      <svg class="check-icon" viewBox="0 0 16 16" fill="none"
                           xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor"
                              stroke-width="1.5" stroke-linecap="round"
                              stroke-linejoin="round"/>
                      </svg>`
            : null}
                </div>
              `)}
            </div>`
        : null}
      </div>
    `;
  }

  override render() {
    const entries = Object.entries(this.items);

    return html`
      <div class="container" style="--ss-max-height: ${this.maxHeight}">
        ${entries.length === 0
        ? html`<div class="empty-state">暂无数据</div>`
        : repeat(
          entries,
          ([, item]) => item.id,
          ([name, item]) => this._renderRow(name, item)
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "status-selector": StatusSelector;
  }
  interface HTMLElementEventMap {
    "status-change": CustomEvent<StatusChangeDetail>;
  }
}