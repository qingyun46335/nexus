import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "../components/daisy-ui-element";

@customElement("error-element")
export class ErrorElement extends DaisyUIElement {

    static defaultStyles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: oklch(var(--b1));
            font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }

        .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            padding: 3rem 2rem;
            text-align: center;
            max-width: 360px;
        }

        .icon-wrap {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background-color: oklch(var(--wa) / 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            color: oklch(var(--wa));
        }

        .icon-wrap svg {
            width: 28px;
            height: 28px;
            stroke: currentColor;
            fill: none;
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .code {
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: oklch(var(--wa));
            opacity: 0.7;
        }

        .title {
            font-size: 1.375rem;
            font-weight: 600;
            color: oklch(var(--bc));
            margin: 0;
            line-height: 1.3;
        }

        .desc {
            font-size: 0.9rem;
            color: oklch(var(--bc) / 0.5);
            line-height: 1.6;
            margin: 0;
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
            width: 100%;
            margin-top: 0.5rem;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            border-radius: 10px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: none;
            background-color: oklch(var(--p));
            color: oklch(var(--pc));
            transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .btn-primary:hover {
            opacity: 0.88;
            transform: translateY(-1px);
        }

        .btn-ghost {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.625rem 1.25rem;
            border-radius: 10px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: 1.5px solid oklch(var(--b3));
            background: transparent;
            color: oklch(var(--bc) / 0.6);
            transition: border-color 0.15s ease, color 0.15s ease;
        }

        .btn-ghost:hover {
            border-color: oklch(var(--bc) / 0.3);
            color: oklch(var(--bc) / 0.85);
        }
    `;

    render() {
        return html`
            <div class="container">
                <div class="icon-wrap">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <span class="code">出了点问题</span>
                <h1 class="title">页面加载失败</h1>
                <p class="desc">服务暂时无法响应，请稍后重试。如果问题持续存在，请联系管理员。</p>
                <div class="actions">
                    <button class="btn-primary" @click=${() => window.location.reload()}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        重新加载
                    </button>
                    <a class="btn-ghost" href="/">返回首页</a>
                </div>
            </div>
        `;
    }
}
