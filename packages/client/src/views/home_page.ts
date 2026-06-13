import { html, css } from "lit";
import { DaisyUIElement } from "../components/daisy-ui-element"; // 路径按你的项目调整
import { customElement, state } from "lit/decorators.js";

export interface ModuleCard {
  title: string;
  description: string;
  link: string;
  icon?: string;
  status: "ready" | "wip";
}

const MODULES: ModuleCard[] = [
  { title: "博客", description: "文章、随笔与技术分析", icon: "ti-notebook", link: "/pages/home", status: "ready" },
  { title: "博客后台", description: "博客管理", link: "/pages/admin", status: "ready" }
  // { title: "归档", description: "按时间线浏览所有内容", icon: "ti-calendar", link: "/pages/archive", status: "ready" },
  // { title: "项目", description: "我正在构建的东西", icon: "ti-code", link: "/pages/projects", status: "wip" },
  // { title: "读书", description: "书摘与思考记录", icon: "ti-book", link: "/pages/reading", status: "wip" },
  // { title: "关于", description: "这里是谁，在做什么", icon: "ti-user", link: "/pages/about", status: "ready" },
  // { title: "订阅", description: "Newsletter · RSS · 推送", icon: "ti-rss", link: "/pages/subscribe", status: "wip" },
];

@customElement("home-page")
export class HomePage extends DaisyUIElement {
  @state() private _showCards = false;

  static defaultStyles = css`
    /* ─── 宿主撑满 ─── */
    :host {
      display: block;
      width: 100%;
    }

    /* ─── 外层：grid 叠层，两个 layer 占同一格 ─── */
    .hero {
      width: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      display: grid;
      grid-template-areas: "stack";
      place-items: center;
      overflow: hidden;
    }

    /* ─── 两个 layer 叠在同一 grid cell ─── */
    .hero-layer,
    .cards-layer {
      grid-area: stack;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* ─── Hero 层 ─── */
    .hero-layer {
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .hero-layer.hidden {
      opacity: 0;
      transform: translateY(-20px);
      pointer-events: none;
    }

    .nexus-logo {
      font-size: clamp(4rem, 15vw, 8rem);
      font-weight: 900;
      letter-spacing: -0.03em;
      background: linear-gradient(to right, #c7d2fe, #e0e7ff, #ffffff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 8px;
      line-height: 1;
      text-align: center;
    }

    .hero-sub {
      color: rgba(199, 210, 254, 0.8);
      font-size: clamp(0.85rem, 2.5vw, 1.1rem);
      font-weight: 300;
      letter-spacing: 0.1em;
      margin: 0 0 40px;
      text-align: center;
    }

    .btn-explore {
      animation: pulse-glow 2.5s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.6); }
      50%       { box-shadow: 0 0 24px 8px rgba(129, 140, 248, 0.25); }
    }

    /* ─── 卡片层 ─── */
    .cards-layer {
      padding: clamp(32px, 5vw, 56px) clamp(20px, 6vw, 72px) clamp(28px, 4vw, 44px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      box-sizing: border-box;
      justify-content: flex-start;
      padding-top: clamp(40px, 8vh, 80px);
    }
    .cards-layer.visible {
      opacity: 1;
      pointer-events: all;
    }

    .cards-header {
      width: 100%;
      color: rgba(199, 210, 254, 0.45);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 16px;
    }

    /* ─── 卡片网格：桌面3列，平板2列，手机1列 ─── */
    .cards-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: clamp(10px, 1.5vw, 14px);
      flex: 1;
    }

    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .cards-layer {
        padding-top: clamp(32px, 6vh, 56px);
      }
    }

    @media (max-width: 480px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ─── 单张卡片 ─── */
    .module-card {
      perspective: 700px;
    }

    .card-inner {
      width: 100%;
      height: 100%;
      min-height: clamp(110px, 16vh, 150px);
      transform-style: preserve-3d;
      transform: rotateY(90deg) scaleX(0.5);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
      border-radius: 12px;
    }
    .card-inner.flipped-in {
      transform: rotateY(0deg) scaleX(1);
      opacity: 1;
    }

    .card-face {
      width: 100%;
      height: 100%;
      border-radius: 12px;
      padding: clamp(12px, 2vw, 18px);
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      box-sizing: border-box;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }

    .module-card.ready .card-face {
      cursor: pointer;
    }
    .module-card.ready .card-face:hover {
      background: rgba(255, 255, 255, 0.13);
      border-color: rgba(199, 210, 254, 0.3);
      transform: translateY(-3px);
    }
    .module-card.wip .card-face {
      opacity: 0.5;
      cursor: default;
    }

    .card-icon {
      font-size: 20px;
      color: #a5b4fc;
      height: 26px;
      display: flex;
      align-items: center;
    }
    .card-title {
      font-size: clamp(13px, 1.5vw, 15px);
      font-weight: 600;
      color: #e0e7ff;
      margin: 0;
    }
    .card-desc {
      font-size: clamp(11px, 1.2vw, 12px);
      color: rgba(199, 210, 254, 0.6);
      line-height: 1.5;
      flex: 1;
      margin: 0;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }

    .badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 99px;
      letter-spacing: 0.04em;
    }
    .badge-ready {
      background: rgba(52, 211, 153, 0.15);
      color: #6ee7b7;
      border: 1px solid rgba(52, 211, 153, 0.25);
    }
    .badge-wip {
      background: rgba(251, 191, 36, 0.12);
      color: #fcd34d;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    .card-arrow {
      color: #818cf8;
      opacity: 0;
      transition: opacity 0.2s ease;
      font-size: 13px;
    }
    .module-card.ready .card-face:hover .card-arrow {
      opacity: 1;
    }

    /* ─── 返回按钮 ─── */
    .back-btn {
      align-self: flex-end;
      margin-top: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 99px;
      color: rgba(199, 210, 254, 0.65);
      font-size: 12px;
      padding: 6px 16px;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .back-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #e0e7ff;
    }
  `;

  render() {
    return html`
      <div class="hero">
        <!-- Hero 层 -->
        <div class="hero-layer ${this._showCards ? "hidden" : ""}">
          <h1 class="nexus-logo">nexus</h1>
          <p class="hero-sub">理解过去 · 留存未来</p>
          <button
            class="btn btn-primary btn-lg btn-explore gap-2 px-8 rounded-full capitalize shadow-xl shadow-indigo-500/20"
            @click=${this._handleExplore}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            开始探索
          </button>
        </div>

        <!-- 卡片层 -->
        <div class="cards-layer ${this._showCards ? "visible" : ""}">
          <p class="cards-header">模块导航</p>
          <div class="cards-grid">
            ${MODULES.map((m, i) => this._renderCard(m, i))}
          </div>
          <button class="back-btn" @click=${this._handleBack}>← 返回</button>
        </div>
      </div>
    `;
  }

  private _renderCard(m: ModuleCard, index: number) {
    return html`
      <div class="module-card ${m.status}">
        <div class="card-inner" id="card-${index}">
          <div
            class="card-face"
            @click=${m.status === "ready" ? () => this._navigate(m.link) : null}
          >
            ${m.icon
        ? html`<div class="card-icon"><i class="ti ${m.icon}" aria-hidden="true"></i></div>`
        : null}
            <p class="card-title">${m.title}</p>
            <p class="card-desc">${m.description}</p>
            <div class="card-footer">
              <span class="badge ${m.status === "ready" ? "badge-ready" : "badge-wip"}">
                ${m.status === "ready" ? "已上线" : "建设中"}
              </span>
              ${m.status === "ready"
        ? html`<i class="ti ti-arrow-right card-arrow" aria-hidden="true"></i>`
        : null}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _handleExplore() {
    this._showCards = true;
    this.updateComplete.then(() => {
      MODULES.forEach((_, i) => {
        setTimeout(() => {
          this.shadowRoot?.getElementById(`card-${i}`)?.classList.add("flipped-in");
        }, 80 + i * 70);
      });
    });
  }

  private _handleBack() {
    MODULES.forEach((_, i) => {
      this.shadowRoot?.getElementById(`card-${i}`)?.classList.remove("flipped-in");
    });
    this._showCards = false;
  }

  private _navigate(link: string) {
    window.location.href = link;
  }
}
