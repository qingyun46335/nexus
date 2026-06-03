import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';
import axiosi from '../../utils/axios';

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

    @state() token = ""

    @state() textContent: string = "Loading...";

    constructor() {
        super();
        axiosi.get("/access").then(res => {
            if (res.status === 200) {
                this.token = res.data
            }
        })
    }

    connectedCallback(): void {
        super.connectedCallback();

    }

    protected renderContent(): TemplateResult {
        return html`
            <div class="flex justify-center items-center h-full">
                <img max-width="100%" src="${this.path}?token=${this.token}" alt="Image Preview">
            </div>
        `;
    }
}