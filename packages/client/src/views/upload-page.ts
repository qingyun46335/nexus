import { customElement } from "lit/decorators.js";
import { DaisyUIElement } from "../components/daisy-ui-element";
import { html } from "lit";

import "../components/blog-uploader";

@customElement("upload-page")
export class UploadPage extends DaisyUIElement {
  render() {
    return html`<blog-uploader></blog-uploader>`;
  }
}
