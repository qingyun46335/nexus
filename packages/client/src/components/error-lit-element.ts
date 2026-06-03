import { DaisyUIElement } from "./daisy-ui-element";

import '../components/error-element'
import '../components/forbidden-element'
import '../components/loading-element'
import '../components/unauthorized-element'
import '../components/not-found-element'
import { html } from "lit";

export class ErrorLitElement extends DaisyUIElement {
    // 未认证或者认证失败
    protected renderUnauthorized() {
        return html`<unauthorized-element .redirectUrl = ${localStorage.getItem("redirectUrl")}></unauthorized-element>`
    }

    protected renderForbidden() {
        return html`<forbidden-element></forbidden-element>`
    }

    protected renderError() {
        return html`<error-element></error-element>`
    }

    protected renderLoading() {
        return html`<loading-element></loading-element>`
    }

    protected renderNotFound() {
        return html`<not-found-element></not-found-element>`
    }
}