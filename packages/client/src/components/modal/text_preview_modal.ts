import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';

import axiosi from '../../utils/axios';

@customElement("text-preview-modal")
export class TextPreviewModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '60vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '60vh' : '94vh';
    }

    @property({ type: String }) path = ""

    oldPath: string = ""

    @state() textContent: string = "Loading...";

    constructor() {
        super();
    }

    connectedCallback(): void {
        super.connectedCallback();

    }

    private async fetchTextContent() {
        if (!this.path) {
            return "No file path provided.";
        }
        if (this.path === this.oldPath) {
            return; // 路径未变，不重复请求
        }
        await axiosi.get(this.path)
            .then(response => {
                this.oldPath = this.path; // 更新旧路径
                this.textContent = response.data;
            })
            .catch(error => {
                console.error("Error fetching text content:", error);
                this.textContent = "Error fetching text content.";
            });
    }

    protected renderContent(): TemplateResult {
        this.fetchTextContent();
        return html`
            <div>
                <pre>${this.textContent}</pre>
            </div>
        `;
    }
}