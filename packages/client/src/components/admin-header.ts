

import { html, css } from 'lit';
import { customElement, } from 'lit/decorators.js';
import { DaisyUIElement } from './daisy-ui-element';

import "../components/rainbow-button"

@customElement("admin-header")
export class AdminHeader extends DaisyUIElement {
    static defaultStyles = css`
    /* Styles go here */
  `;

    constructor() {
        super();
    }

    render() {
        return html`
            <div class="navbar bg-base-300">
                <div class="navbar-start">
                    <rainbow-button animated .selected=${true} @click=${() => window.location.href = "/pages/admin"}>Admin Panel</rainbow-button>
                    <button class="btn btn-primary ml-4" @click=${() => window.location.href = "/pages/admin/article"}>Articles</button>
                    <button class="btn btn-secondary ml-2" @click=${() => window.location.href = "/pages/admin/blog-setting"}>Blog</button>
                </div>
                <div class="navbar-end">
                    <a class="btn btn-ghost" @click=${() => { this.logout() }}>Logout</a>
                </div>
            </div>    
        `;
    }
    logout() {
        localStorage.removeItem("token");
        window.toast.success("Logged out successfully");
        setTimeout(() => {
            window.location.href = "/pages/login";
        }, 2000)
    }
}