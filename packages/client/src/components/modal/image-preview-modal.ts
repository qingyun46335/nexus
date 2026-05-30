import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';

@customElement("image-preview-modal")
export class ImagePreviewModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '60vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '50vh' : '94vh';
    }

    @property({ type: String }) path = ""

    @state() textContent: string = "Loading...";

    constructor() {
        super();
    }

    connectedCallback(): void {
        super.connectedCallback();

    }

    protected renderContent(): TemplateResult {
        return html`
            <div class="flex justify-center items-center h-full">
                <img max-width="100%" src="${this.path}" alt="Image Preview">
            </div>
        `;
    }
}