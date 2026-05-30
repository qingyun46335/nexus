import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';

@customElement("video-preview-modal")
export class VideoPreviewModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '60vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '80vh' : '70vh';
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
            <div>
                <video max-width="100%" max-height="100%" controls>
                    <source src="${this.path}">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }
}