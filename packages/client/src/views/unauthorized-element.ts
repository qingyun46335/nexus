import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "../components/daisy-ui-element";

@customElement("unauthorized-element")
export class UnauthorizedElement extends DaisyUIElement {

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
            background-color: oklch(var(--er) / 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            color: oklch(var(--er));
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
            color: oklch(var(--er));
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

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
            .icon-wrap {
                background-color: oklch(var(--er) / 0.12);
            }
        }
    `;

    render() {
        return html`
            <div class="container">
                <div class="icon-wrap">
                    <svg viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <span class="code">401 Unauthorized</span>
                <h1 class="title">需要登录才能访问</h1>
                <p class="desc">您当前未登录，或登录已过期。请重新登录后继续。</p>
                <div class="actions">
                    <a class="btn-primary" href="/pages/login">前往登录</a>
                    <a class="btn-ghost" href="/">返回首页</a>
                </div>
            </div>
        `;
    }
}
