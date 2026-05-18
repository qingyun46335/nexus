import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "../components/daisy-ui-element";

@customElement("not-found-element")
export class NotFoundElement extends DaisyUIElement {

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
            background-color: oklch(var(--bc) / 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            color: oklch(var(--bc) / 0.3);
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
            color: oklch(var(--bc) / 0.35);
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
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                </div>
                <span class="code">404 Not Found</span>
                <h1 class="title">页面不存在</h1>
                <p class="desc">您访问的地址不存在，可能已被移动或删除。</p>
                <div class="actions">
                    <a class="btn-primary" href="/">返回首页</a>
                    <button class="btn-ghost" @click=${() => window.history.back()}>返回上一页</button>
                </div>
            </div>
        `;
    }
}
