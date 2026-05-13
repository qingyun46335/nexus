import { html, css } from 'lit';
import { DaisyUIElement } from '../components/daisy-ui-element'; // 路径按你的项目调整
import { customElement } from 'lit/decorators.js';

@customElement("home-page")
export class HomePage extends DaisyUIElement {
  static defaultStyles = css`
    :host {
      display: block;
    }

    .hero {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
    }

    .nexus-logo {
      font-size: clamp(4rem, 15vw, 8rem);
      font-weight: 900;
      letter-spacing: -0.03em;
      background: linear-gradient(to right, #c7d2fe, #e0e7ff, #ffffff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 60px rgba(199, 210, 254, 0.4);
    }

    .btn-explore {
      animation: pulse-glow 2.5s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.6);
    }

    @keyframes pulse-glow {
      0%,
      100% {
        box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.6);
      }
      50% {
        box-shadow: 0 0 24px 8px rgba(129, 140, 248, 0.25);
      }
    }
  `;

  render() {
    return html`
      <div class="hero">
        <div class="hero-content text-center">
          <div class="max-w-lg">
            <!-- 标志 -->
            <h1 class="nexus-logo mb-4">nexus</h1>

            <!-- 一句轻量描述 -->
            <p class="text-indigo-200/80 text-lg sm:text-xl mb-10 font-light tracking-wide">
              连接数据 · 驱动智能
            </p>

            <!-- 跳转按钮 -->
            <button
              class="btn btn-primary btn-lg btn-explore gap-2 px-8 rounded-full capitalize shadow-xl shadow-indigo-500/20"
              @click=${this._handleExplore}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              开始探索
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _handleExplore() {
    // 自定义跳转逻辑，例如：
    window.location.href = '/admin/test';
    console.log('nexus 探索启动');
  }
}