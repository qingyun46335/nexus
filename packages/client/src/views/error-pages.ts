import { customElement, state } from "lit/decorators.js";
import { ErrorLitElement } from "../components/error-lit-element";

type errorPageType = "404" | "500" | "401" | "403"

@customElement("error-pages")
export class ErrorPages extends ErrorLitElement {

    @state()
    private errorPageType: errorPageType = this.getErrorType()

    private getErrorType(): errorPageType {
        const params = new URLSearchParams(window.location.search)

        const code = params.get("code")

        switch (code) {
            case "401":
            case "403":
            case "404":
            case "500":
                return code
            default:
                return "404"
        }
    }

    render() {
        switch (this.errorPageType) {
            case "404": return this.renderNotFound()
            case "500": return this.renderError()
            case "401": return this.renderUnauthorized()
            case "403": return this.renderForbidden()
        }
    }

}