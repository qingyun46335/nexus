import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';

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
                <audio controls>
                    <source src="${this.path}">
                    Your browser does not support the audio tag.
                </audio>
            </div>
        `;
    }
}