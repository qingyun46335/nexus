import { html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AuthLitElement } from "../../components/auth-lit-element";

export interface MenuItem {
  label: string;
  href: string;
  icon?: string; // SVG string
  description?: string;
}

const sampleMenu: MenuItem[] = [
  {
    label: "文章管理",
    href: "/pages/admin/article",
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4V20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 16H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke
-linejoin="round"/></svg>`,
    description: "创建、编辑和管理文章内容"
  },
]

@customElement("admin-index-page")
export class AdminIndexPage extends AuthLitElement {
  @property({ type: Array })
  menu: MenuItem[] = sampleMenu;

  @property({ type: String })
  username: string = "Admin";

  @state()
  private _hoveredIndex: number | null = null;

  static defaultStyles = css`
    :host {
      display: block;
      min-height: 100vh;
      font-family: "DM Sans", "Noto Sans SC", ui-sans-serif, system-ui, sans-serif;
    }

    /* ── Layout ── */
    .page {
      min-height: 100vh;
      background-color: oklch(var(--b1));
      color: oklch(var(--bc));
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      padding: 2.5rem 2rem 0;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    .header-eyebrow {
      font-size: 0.7rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      opacity: 0.4;
      margin-bottom: 0.4rem;
    }

    .header-greeting {
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .header-greeting .username {
      color: oklch(var(--p));
    }

    .header-divider {
      margin: 2rem 0 0;
      border: none;
      height: 1px;
      background: linear-gradient(
        to right,
        oklch(var(--bc) / 0.12) 0%,
        oklch(var(--bc) / 0.04) 60%,
        transparent 100%
      );
    }

    /* ── Section label ── */
    .section-label {
      font-size: 0.68rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.35;
      padding: 2rem 2rem 1rem;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }

    /* ── Grid ── */
    .grid-wrapper {
      padding: 0 2rem 3rem;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      flex: 1;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    @media (max-width: 480px) {
      .grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .header {
        padding: 1.75rem 1.25rem 0;
      }
      .grid-wrapper {
        padding: 0 1.25rem 2.5rem;
      }
      .section-label {
        padding: 1.5rem 1.25rem 0.75rem;
      }
    }

    /* ── Card ── */
    .card {
      position: relative;
      border-radius: 1rem;
      padding: 1.4rem 1.25rem 1.25rem;
      cursor: pointer;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow: hidden;

      background-color: oklch(var(--b2));
      border: 1px solid oklch(var(--bc) / 0.06);

      transition:
        transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.2s ease,
        border-color 0.2s ease,
        background-color 0.2s ease;

      /* stagger via inline style */
      animation: card-in 0.45s both;
    }

    @keyframes card-in {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .card:hover {
      transform: translateY(-3px) scale(1.015);
      box-shadow: 0 8px 28px oklch(var(--bc) / 0.1);
      border-color: oklch(var(--p) / 0.25);
      background-color: oklch(var(--b3));
    }

    /* shimmer accent line on hover */
    .card::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, oklch(var(--p)), oklch(var(--s)));
      border-radius: 1rem 1rem 0 0;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .card:hover::after {
      opacity: 1;
    }

    /* ── Icon wrapper ── */
    .card-icon {
      width: 2.4rem;
      height: 2.4rem;
      border-radius: 0.6rem;
      background-color: oklch(var(--p) / 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s ease;
    }

    .card:hover .card-icon {
      background-color: oklch(var(--p) / 0.18);
    }

    .card-icon svg,
    .card-icon ::slotted(svg) {
      width: 1.2rem;
      height: 1.2rem;
      color: oklch(var(--p));
    }

    /* fallback letter avatar */
    .card-icon-letter {
      font-size: 1rem;
      font-weight: 700;
      color: oklch(var(--p));
      line-height: 1;
    }

    /* ── Text ── */
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }

    .card-label {
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }

    .card-desc {
      font-size: 0.72rem;
      opacity: 0.45;
      line-height: 1.5;
    }

    /* arrow hint */
    .card-arrow {
      align-self: flex-end;
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.18s ease, transform 0.18s ease;
      color: oklch(var(--p));
    }

    .card:hover .card-arrow {
      opacity: 0.7;
      transform: translateX(0);
    }

    /* ── Empty state ── */
    .empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 0;
      opacity: 0.3;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
    }
  `;

  private _handleCardClick(href: string) {
    window.location.href = href;
  }

  private _renderIcon(item: MenuItem) {
    if (item.icon) {
      return html`<div class="card-icon" .innerHTML=${item.icon}></div>`;
    }
    // Fallback: first letter
    return html`
      <div class="card-icon">
        <span class="card-icon-letter">${item.label.charAt(0).toUpperCase()}</span>
      </div>
    `;
  }

  private _renderCards() {
    if (!this.menu?.length) {
      return html`<div class="empty">暂无模块</div>`;
    }

    return this.menu.map(
      (item, i) => html`
        <div
          class="card"
          style="animation-delay: ${i * 55}ms"
          role="link"
          tabindex="0"
          @click=${() => this._handleCardClick(item.href)}
          @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") this._handleCardClick(item.href);
        }}
          aria-label=${item.label}
        >
          ${this._renderIcon(item)}
          <div class="card-body">
            <div class="card-label">${item.label}</div>
            ${item.description
          ? html`<div class="card-desc">${item.description}</div>`
          : null}
          </div>
          <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      `
    );
  }

  renderContent() {
    return html`
      <div class="page">
        <div class="header">
          <div class="header-eyebrow">管理后台</div>
          <div class="header-greeting">
            欢迎回来，<span class="username">${this.username}</span>
          </div>
          <hr class="header-divider" />
        </div>

        <div class="section-label">功能模块</div>

        <div class="grid-wrapper">
          <div class="grid">
            ${this._renderCards()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "admin-index-page": AdminIndexPage;
  }
}