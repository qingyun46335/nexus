import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';
import axiosi from '../../utils/axios';

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
            <div>
                <video  src="${this.path}?token=${this.token}" max-width="100%" max-height="100%" controls>
                    Your browser does not support the video tag.
                </video>
            </div>
        `;
    }
}