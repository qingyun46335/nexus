import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('nexus-homepage')
export class NexusHomepage extends LitElement {
    static styles = css`
        /* 1. 定义主题变量，支持外部覆盖 */
        :host {
            --bg-color: #f8fafc;       /* 白天背景色 */
            --text-color: #0f172a;     /* 白天主文字色 */
            --btn-text: rgba(15, 23, 42, 0.5); /* 白天按钮默认色 */
            --btn-hover: #0f172a;      /* 白天按钮悬停色 */
            
            display: block;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* 2. 监听系统级别的深色模式偏好 */
        @media (prefers-color-scheme: dark) {
            :host {
                --bg-color: #050505;       /* 极致纯粹的黑夜背景 */
                --text-color: #ffffff;     /* 黑夜主文字色 */
                --btn-text: rgba(255, 255, 255, 0.4); /* 黑夜按钮默认色 */
                --btn-hover: #ffffff;      /* 黑夜按钮悬停色 */
            }
        }

        /* 3. 布局与基础样式 */
        .container {
            min-height: 100vh;
            width: 100%;
            background-color: var(--bg-color);
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            overflow: hidden;
            /* 背景色和文字颜色平滑过渡，切换深浅色时更自然 */
            transition: background-color 0.8s ease, color 0.8s ease; 
        }

        main {
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            z-index: 10;
        }

        /* 4. 核心视窗：大字号与超大字距 */
        h1 {
            font-size: 5rem;
            font-weight: 900;
            letter-spacing: 0.3em; /* 对应 tracking-[0.3em] */
            margin: 0;
            margin-right: -0.3em; /* 修正字距带来的视觉不居中问题 */
            user-select: none;
            animation: float 6s ease-in-out infinite;
        }

        /* 响应式：大屏下字体更大，增强视觉张力 */
        @media (min-width: 768px) { h1 { font-size: 8rem; } }
        @media (min-width: 1024px) { h1 { font-size: 10rem; } }

        /* 5. 底部交互区 */
        footer {
            height: 8rem;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            width: 100%;
            z-index: 10;
            padding-bottom: 2rem;
        }

        button {
            background: transparent;
            border: none;
            color: var(--btn-text);
            font-size: 1rem;
            letter-spacing: 0.2em;
            cursor: pointer;
            padding: 1rem 2rem;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            transition: color 0.3s ease;
            font-weight: 500;
            font-family: inherit;
        }

        button:hover {
            color: var(--btn-hover);
        }

        svg {
            height: 1.25rem;
            width: 1.25rem;
            margin-left: 0.5rem;
            animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* 6. 动画定义 */
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
        }

        @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
    `;

    render() {
        return html`
            <div class="container">
                <main>
                    <h1>NEXUS</h1>
                </main>

                <footer>
                    <button @click=${this._handleEnter}>
                        ENTER
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                </footer>
            </div>
        `;
    }

    private _handleEnter() {
        console.log('Navigating from NEXUS...');
        window.location.href = '/admin/test';
    }
}