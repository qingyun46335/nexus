import { html, css } from 'lit';
import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "./components/daisy-ui-element";
import "./views/home_page"

@customElement("my-index")
export class MyIndex extends DaisyUIElement {
    static defaultStyles = css``

    render() {
        return html`
            <home-page></home-page>
        `
    }
}


declare global {
    interface HTMLElementTagNameMap {
        "my-index": MyIndex;
    }
}