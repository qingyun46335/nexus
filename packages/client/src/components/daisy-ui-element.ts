import { LitElement, css } from "lit";
import { unsafeCSS } from "lit";
import globalStyles from "../index.css?inline";

export class DaisyUIElement extends LitElement {

    static defaultStyles = css``;

    static get styles() {
        return [unsafeCSS(globalStyles), this.defaultStyles || css``]
    };
}