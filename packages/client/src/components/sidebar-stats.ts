import { html, css, svg } from "lit";
import { customElement, state, property } from "lit/decorators.js";
// import axios from "axios";
import { DaisyUIElement } from "./daisy-ui-element";
import axiosi from "../utils/axios";

// ────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────

interface StatsOverview {
  total: number;
  published: number;
  draft: number;
  totalViews: number;
}

interface DailyPoint {
  date: string;   // "YYYY-MM-DD"
  value: number;
}

interface TagStat {
  name: string;
  count: number;
}

interface SidebarData {
  overview: StatsOverview;
  dailyArticles: DailyPoint[];   // last 30 days
  dailyViews: DailyPoint[];      // last 30 days
  topTags: TagStat[];            // top 8
}

type ChartMode = "articles" | "views";

// ────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 10_000) return (n / 10_000).toFixed(1) + "w";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function polyline(
  points: DailyPoint[],
  w: number,
  h: number,
  pad = 6
): { pts: string; fillPts: string; dots: { x: number; y: number; v: number }[] } {
  if (!points.length) return { pts: "", fillPts: "", dots: [] };
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const xStep = (w - pad * 2) / Math.max(points.length - 1, 1);
  const toX = (i: number) => pad + i * xStep;
  const toY = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);
  const dots = points.map((p, i) => ({ x: toX(i), y: toY(p.value), v: p.value }));
  const pts = dots.map((d) => `${d.x},${d.y}`).join(" ");
  const fillPts =
    `${dots[0].x},${h} ` +
    dots.map((d) => `${d.x},${d.y}`).join(" ") +
    ` ${dots[dots.length - 1].x},${h}`;
  return { pts, fillPts, dots };
}

// ────────────────────────────────────────────────────────────
//  Component
// ────────────────────────────────────────────────────────────

@customElement("sidebar-stats")
export class SidebarStats extends DaisyUIElement {
  @property({ type: String }) apiBase = "/api";

  @state() private data: SidebarData | null = null;
  @state() private loading = true;
  @state() private error = "";
  @state() private chartMode: ChartMode = "articles";
  @state() private sliding: "left" | "right" | null = null;
  @state() private tooltip: { x: number; y: number; date: string; value: number } | null = null;

  connectedCallback() {
    super.connectedCallback();
    this._fetch();
  }

  private async _fetch() {
    this.loading = true;
    this.error = "";
    try {
      const res = await axiosi.get<SidebarData>(`/admin/stats/sidebar`);
      this.data = res.data;
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : "加载失败";
    } finally {
      this.loading = false;
    }
  }

  // ── Chart mode switch with slide animation ────────────────
  private async _switchChart(dir: "left" | "right") {
    if (this.sliding) return;
    const next: ChartMode =
      this.chartMode === "articles" ? "views" : "articles";
    this.sliding = dir;
    await new Promise((r) => setTimeout(r, 260));
    this.chartMode = next;
    this.sliding = null;
  }

  // ── Tooltip ───────────────────────────────────────────────
  private _onDotEnter(
    e: MouseEvent,
    date: string,
    value: number
  ) {
    (e.target as SVGElement)
      .closest("svg")!
      .getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    this.tooltip = {
      x: (e.target as SVGElement).getBoundingClientRect().left - hostRect.left,
      y: (e.target as SVGElement).getBoundingClientRect().top - hostRect.top - 36,
      date,
      value,
    };
  }

  private _onDotLeave() {
    this.tooltip = null;
  }

  // ── Renders ───────────────────────────────────────────────

  private _renderCards(ov: StatsOverview) {
    const cards = [
      { label: "全部文章", value: ov.total, icon: "📄", accent: "card-total" },
      { label: "已发布", value: ov.published, icon: "✅", accent: "card-pub" },
      { label: "草稿", value: ov.draft, icon: "✏️", accent: "card-draft" },
      { label: "总浏览", value: ov.totalViews, icon: "👁", accent: "card-views" },
    ];
    return html`
      <div class="cards-grid">
        ${cards.map(
      (c) => html`
            <div class="stat-card ${c.accent}">
              <span class="card-icon">${c.icon}</span>
              <span class="card-value">${fmtNum(c.value)}</span>
              <span class="card-label">${c.label}</span>
            </div>
          `
    )}
      </div>
    `;
  }

  private _renderChart(data: SidebarData) {
    const W = 220, H = 90;
    const points =
      this.chartMode === "articles" ? data.dailyArticles : data.dailyViews;
    const { pts, fillPts, dots } = polyline(points, W, H);
    const label =
      this.chartMode === "articles" ? "每日新增文章" : "每日浏览量";
    const gradId =
      this.chartMode === "articles" ? "grad-articles" : "grad-views";

    const slideClass = this.sliding
      ? this.sliding === "right"
        ? "slide-out-left"
        : "slide-out-right"
      : "slide-in";

    return html`
      <div class="chart-section">
        <!-- header -->
        <div class="chart-header">
          <button
            class="arrow-btn"
            @click=${() => this._switchChart("left")}
            title="上一指标"
          >&#8592;</button>
          <span class="chart-label">${label}</span>
          <button
            class="arrow-btn"
            @click=${() => this._switchChart("right")}
            title="下一指标"
          >&#8594;</button>
        </div>

        <!-- svg chart -->
        <div class="chart-wrap">
          <div class="chart-inner ${slideClass}">
            <svg
              viewBox="0 0 ${W} ${H}"
              xmlns="http://www.w3.org/2000/svg"
              class="chart-svg"
              aria-label="${label}趋势图"
            >
              <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--chart-color)" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="var(--chart-color)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <!-- fill -->
              ${fillPts
        ? svg`<polygon points="${fillPts}" fill="url(#${gradId})" />`
        : ""}
              <!-- line -->
              ${pts
        ? svg`<polyline
                    points="${pts}"
                    fill="none"
                    stroke="var(--chart-color)"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />`
        : ""}
              <!-- dots -->
              ${dots.map(
          (d, i) => svg`
                  <circle
                    cx="${d.x}" cy="${d.y}" r="3"
                    fill="var(--chart-color)"
                    class="chart-dot"
                    @mouseenter=${(e: MouseEvent) =>
              this._onDotEnter(e, points[i].date, d.v)}
                    @mouseleave=${this._onDotLeave}
                  />
                `
        )}
            </svg>
          </div>

          <!-- x-axis: first & last date -->
          ${points.length
        ? html`
                <div class="chart-axis">
                  <span>${points[0].date.slice(5)}</span>
                  <span>${points[points.length - 1].date.slice(5)}</span>
                </div>
              `
        : ""}
        </div>

        <!-- mode dots indicator -->
        <div class="mode-dots">
          <span class="mode-dot ${this.chartMode === "articles" ? "active" : ""}"></span>
          <span class="mode-dot ${this.chartMode === "views" ? "active" : ""}"></span>
        </div>
      </div>
    `;
  }

  private _renderTagBars(tags: TagStat[]) {
    const max = Math.max(...tags.map((t) => t.count), 1);
    return html`
      <div class="tags-section">
        <div class="section-title">标签热度</div>
        <div class="tag-bars">
          ${tags.map(
      (t) => html`
              <div class="tag-bar-row">
                <span class="tag-name">${t.name}</span>
                <div class="tag-bar-track">
                  <div
                    class="tag-bar-fill"
                    style="width:${(t.count / max) * 100}%"
                  ></div>
                </div>
                <span class="tag-count">${t.count}</span>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="center-box">
          <span class="loading loading-spinner loading-md text-primary"></span>
        </div>
      `;
    }
    if (this.error) {
      return html`
        <div class="center-box error-box">
          <span>${this.error}</span>
          <button class="btn btn-xs btn-ghost mt-2" @click=${this._fetch}>重试</button>
        </div>
      `;
    }
    if (!this.data) return html``;

    return html`
      <div class="sidebar-root">
        ${this._renderCards(this.data.overview)}
        <div class="divider"></div>
        ${this._renderChart(this.data)}
        <div class="divider"></div>
        ${this._renderTagBars(this.data.topTags)}

        <!-- Tooltip -->
        ${this.tooltip
        ? html`
              <div
                class="chart-tooltip"
                style="left:${this.tooltip.x}px;top:${this.tooltip.y}px"
              >
                <span class="tip-date">${this.tooltip.date.slice(5)}</span>
                <span class="tip-val">${this.tooltip.value}</span>
              </div>
            `
        : ""}
      </div>
    `;
  }

  static defaultStyles = css`
    :host {
      display: block;
      position: relative;
      font-family: "LXGW WenKai", "Noto Serif SC", serif;
      --chart-color: oklch(var(--p));
    }

    /* ── Root ── */
    .sidebar-root {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0.25rem 0;
    }

    .center-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }

    .error-box {
      color: oklch(var(--er));
      font-size: 0.85rem;
      text-align: center;
    }

    .divider {
      height: 1px;
      background: oklch(var(--bc) / 0.08);
      margin: 0.75rem 0;
    }

    /* ── Stat cards ── */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.15rem;
      border-radius: 0.75rem;
      padding: 0.6rem 0.4rem;
      background: oklch(var(--b2));
      border: 1px solid oklch(var(--bc) / 0.06);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: default;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px oklch(var(--bc) / 0.08);
    }

    .card-icon {
      font-size: 1.1rem;
      line-height: 1;
    }

    .card-value {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: oklch(var(--bc));
      line-height: 1.1;
    }

    .card-label {
      font-size: 0.68rem;
      color: oklch(var(--bc) / 0.5);
      text-align: center;
    }

    /* card accent colors — subtle left border */
    .card-total  { border-left: 3px solid oklch(var(--p)); }
    .card-pub    { border-left: 3px solid oklch(var(--su)); }
    .card-draft  { border-left: 3px solid oklch(var(--wa)); }
    .card-views  { border-left: 3px solid oklch(var(--in)); }

    /* ── Chart ── */
    .chart-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chart-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: oklch(var(--bc) / 0.7);
      letter-spacing: 0.02em;
    }

    .arrow-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: oklch(var(--bc) / 0.5);
      font-size: 1rem;
      padding: 0.1rem 0.3rem;
      border-radius: 0.35rem;
      transition: background 0.15s, color 0.15s;
      line-height: 1;
    }

    .arrow-btn:hover {
      background: oklch(var(--bc) / 0.08);
      color: oklch(var(--bc));
    }

    .chart-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow: hidden;
      border-radius: 0.5rem;
    }

    .chart-inner {
      width: 100%;
    }

    /* slide animations */
    @keyframes slide-in-from-right {
      from { transform: translateX(20px); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    @keyframes slide-in-from-left {
      from { transform: translateX(-20px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slide-out-to-left {
      from { transform: translateX(0);   opacity: 1; }
      to   { transform: translateX(-20px); opacity: 0; }
    }
    @keyframes slide-out-to-right {
      from { transform: translateX(0);  opacity: 1; }
      to   { transform: translateX(20px); opacity: 0; }
    }

    .slide-in        { animation: slide-in-from-right 0.26s ease both; }
    .slide-out-left  { animation: slide-out-to-left   0.26s ease both; }
    .slide-out-right { animation: slide-out-to-right  0.26s ease both; }

    .chart-svg {
      width: 100%;
      height: auto;
      display: block;
    }

    .chart-dot {
      cursor: crosshair;
      transition: r 0.1s;
    }
    .chart-dot:hover {
      r: 5;
    }

    .chart-axis {
      display: flex;
      justify-content: space-between;
      font-size: 0.62rem;
      color: oklch(var(--bc) / 0.35);
      padding: 0 4px;
    }

    /* indicator dots */
    .mode-dots {
      display: flex;
      justify-content: center;
      gap: 0.35rem;
      padding-top: 0.15rem;
    }

    .mode-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: oklch(var(--bc) / 0.2);
      transition: background 0.2s, transform 0.2s;
    }

    .mode-dot.active {
      background: oklch(var(--p));
      transform: scale(1.3);
    }

    /* ── Tooltip ── */
    .chart-tooltip {
      position: absolute;
      pointer-events: none;
      background: oklch(var(--b3));
      border: 1px solid oklch(var(--bc) / 0.12);
      border-radius: 0.4rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.72rem;
      display: flex;
      gap: 0.4rem;
      align-items: center;
      box-shadow: 0 2px 8px oklch(var(--bc) / 0.1);
      white-space: nowrap;
      transform: translateX(-50%);
      z-index: 10;
    }

    .tip-date {
      color: oklch(var(--bc) / 0.5);
    }

    .tip-val {
      font-weight: 700;
      color: oklch(var(--p));
    }

    /* ── Tag bars ── */
    .tags-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: oklch(var(--bc) / 0.7);
      letter-spacing: 0.02em;
    }

    .tag-bars {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .tag-bar-row {
      display: grid;
      grid-template-columns: 3.5rem 1fr 1.8rem;
      align-items: center;
      gap: 0.4rem;
    }

    .tag-name {
      font-size: 0.72rem;
      color: oklch(var(--bc) / 0.7);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag-bar-track {
      background: oklch(var(--bc) / 0.07);
      border-radius: 999px;
      height: 5px;
      overflow: hidden;
    }

    .tag-bar-fill {
      height: 100%;
      background: oklch(var(--p));
      border-radius: 999px;
      transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .tag-count {
      font-size: 0.65rem;
      color: oklch(var(--bc) / 0.4);
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "sidebar-stats": SidebarStats;
  }
}