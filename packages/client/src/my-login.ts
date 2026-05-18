import { html, css } from 'lit';
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "./components/daisy-ui-element";
import "./views/login-page"

@customElement("my-login")
export class MyLogin extends DaisyUIElement {
    static defaultStyles = css``

    render() {
        return html`
            <login-page></login-page>
        `
    }
}


declare global {
    interface HTMLElementTagNameMap {
        "my-login": MyLogin;
    }
}