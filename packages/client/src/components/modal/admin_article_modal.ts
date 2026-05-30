import { html, css, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';

import '../blog-uploader';

@customElement("admin-article-modal")
export class AdminArticleModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '60vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '80vh' : '94vh';
    }

    constructor() {
        super();
    }

    protected renderContent(): TemplateResult {
        return html`
            <blog-uploader></blog-uploader>
        `;
    }
}