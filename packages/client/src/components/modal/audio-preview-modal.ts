import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';
import axiosi from '../../utils/axios';

@customElement("audio-preview-modal")
export class AudioPreviewModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '25vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '13vh' : '16vh';
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
                <audio src="${this.path}?token=${this.token}" controls>
                    Your browser does not support the audio tag.
                </audio>
            </div>
        `;
    }
}