import { html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "../components/daisy-ui-element";

@customElement("loading-element")
export class LoadingElement extends DaisyUIElement {

    static defaultStyles = css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: oklch(var(--b1));
        }

        .spinner {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid oklch(var(--bc) / 0.1);
            border-top-color: oklch(var(--bc) / 0.35);
            animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;

    render() {
        return html`
            <div class="spinner" role="status" aria-label="加载中"></div>
        `;
    }
}
