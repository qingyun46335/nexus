import { html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../modal-mixin';
import { DaisyUIElement } from '../daisy-ui-element';
import type { TagEditItem, TagItem } from '../../type/admin';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

const testTags: TagEditItem[] = [
    { name: "测试", count: 2, status: "active", isEditing: false },
    { name: "文章", count: 2, status: "active", isEditing: false },
    { name: "示例", count: 1, status: "active", isEditing: false },
    { name: "标签A", count: 5, status: "active", isEditing: false },
    { name: "标签B", count: 3, status: "active", isEditing: false },
    { name: "标签C", count: 8, status: "active", isEditing: false },
    { name: "测试", count: 2, status: "active", isEditing: false },
    { name: "文章", count: 2, status: "active", isEditing: false },
    { name: "示例", count: 1, status: "active", isEditing: false },
    { name: "标签A", count: 5, status: "active", isEditing: false },
    { name: "标签B", count: 3, status: "active", isEditing: false },
    { name: "标签C", count: 8, status: "active", isEditing: false },
];



@customElement("tag-edit-modal")
export class TagEditModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    @property({ type: Array }) tags: TagItem[] = testTags;

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '60vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '50vh' : '70vh';
    }

    newTagName: string;

    @state()
    isEditMode: boolean = false;

    @state()
    editTags: TagEditItem[] = this.tags.map(tag => ({ ...tag, isEditing: false }));

    constructor() {
        super();
    }

    del() {
        // 实现批量删除功能
        this.editTags = this.editTags.filter(t => !t.isEditing);
        this.tags = this.editTags.filter(t => !this.editTags.includes(t));
    }

    addTag() {
        if (this.newTagName && this.newTagName.trim() !== "") {
            const newTag: TagItem = {
                name: this.newTagName.trim(),
                count: 0,
                status: "active"
            };
            this.tags = [...this.tags, newTag];
            this.newTagName = "";
        }
    }

    protected toggleTag(tag: TagEditItem): void {
        if (this.isEditMode) {
            // 编辑模式下，切换标签的编辑状态
            this.editTags = this.editTags.map(t => t === tag ? { ...t, isEditing: !t.isEditing } : t);
        } else {
            // 非编辑模式下，切换标签的激活状态
            tag.status = tag.status === "active" ? "inactive" : "active";
        }
        this.requestUpdate();
    }

    protected renderContent(): TemplateResult {
        const btn_soft_classes = { "btn-soft": !this.isEditMode }
        return html`
        <div class="actions p-2">
            <div class=" flex gap-2">
                <input class="input" type="text" placeholder="新标签名" @input=${(e: Event) => this.newTagName = (e.target as HTMLInputElement).value} />
                <button class="btn btn-sm btn-primary" @click=${() => this.addTag()}>添加</button>
            </div>
            <div class="flex gap-2">
                <div class="justify-start">
                    <button @click="${() => this.isEditMode = !this.isEditMode}" class="btn btn-sm ${classMap(btn_soft_classes)} btn-primary">编辑模式</button>
                </div>
                
                <div class="justify-end">
                    <button @click="${() => this.del()}" style="${styleMap({ display: this.isEditMode ? 'block' : 'none' })}" class="btn btn-sm">批量删除</button>
                </div>
            </div>
        </div>
        <div class="flex flex-wrap gap-2 p-2">
            ${this.editTags.map(tag => html`
                <button
                    @click=${() => this.toggleTag(tag)}
                    class="
                        badge badge-lg
                        cursor-pointer
                        select-none
                        transition-all
                        hover:scale-105
                        active:scale-95
                        px-3 py-3
                        ${!this.isEditMode ? tag.status === "active"
                ? "badge-primary"
                : "badge-outline hover:badge-primary" : ""}
                    ${this.isEditMode ? tag.isEditing ? "badge-error" : "badge-outline hover:badge-error" : ""}
                "
                >
                    <span>${tag.name}</span>
                    <span class="ml-1 opacity-70 text-xs">
                        ${tag.count}
                    </span>
                </button>
            `)}
        </div>
    `;
    }

    protected renderFooter() {
        return html`<p>非编辑状态下可以对标签进行激活/禁用操作</p>`
    }

}