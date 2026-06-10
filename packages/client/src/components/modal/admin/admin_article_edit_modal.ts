import { html, css, type TemplateResult, type PropertyValues, } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../../modal-mixin';
import { DaisyUIElement } from '../../daisy-ui-element';
import axiosi from '../../../utils/axios';
import type { TagEditItem, TagItem } from '../../../type/admin';

type UpdInfor = {
    title: string,
    description: string,
    status: "published" | "draft" | "archived" | "hide",
}

@customElement("admin-article-edit-modal")
export class AdminArticleEditModal extends ModalMixin(DaisyUIElement) {
    static defaultStyles = css`
        /* Styles go here */
    `;

    @property()
    articleId: string = "";

    @state()
    updInfor: UpdInfor = {
        title: "",
        description: "",
        status: "draft",
    }

    @state()
    allTags: TagEditItem[] = [];

    @state()
    newSwitchTags: string[] = [];

    @state()
    delSwitchTags: string[] = [];

    modalTitle: string = "文章信息更新";

    get computedModalWidth(): string {
        return this.mobile.value ? '100vw' : '35vw';
    }

    get computedModalHeight(): string {
        return this.mobile.value ? '50vh' : '70vh';
    }

    connectedCallback(): void {
        super.connectedCallback();
    }

    @state()
    title: string = "";
    @state()
    description: string = "";
    @state()
    status: string = "";

    protected async firstUpdated(_changedProperties: PropertyValues): Promise<void> {
        super.firstUpdated(_changedProperties)
        this.oldInforLoad()
        await this.loadingActiveTags()
        await this.loadingSwitchTags()
    }

    async loadingActiveTags() {
        await axiosi.get<{ value: TagItem[] }>(`/admin/tag/selectTags`).then(res => {
            if (res.status === 200) {
                this.allTags = res.data.value
            }
        })
    }

    async loadingSwitchTags() {
        if (this.articleId) {
            await axiosi.get<{ value: string[] }>(`/admin/tag/getArticleToTagIds?articleId=${this.articleId}`).then(res => {
                if (res.status === 200) {
                    const articleTagIds = res.data.value
                    this.allTags = this.allTags.map(tag => {
                        if (articleTagIds.find(item => item === tag.id)) {
                            return { ...tag, isEditing: true }
                        } else {
                            return { ...tag, isEditing: false }
                        }
                    })
                }
            })
        }
    }

    oldInforLoad() {
        if (this.articleId) {
            axiosi.get(`/admin/article/getArticle?articleId=${this.articleId}`).then(res => {
                if (res.status === 200) {
                    this.updInfor = res.data.value
                }
            })
        }
    }

    submit() {
        const form = new FormData()
        form.append("article", JSON.stringify(this.updInfor))
        form.append("articleId", this.articleId)
        form.append("newSwitchTags", JSON.stringify(this.newSwitchTags))
        form.append("delSwitchTags", JSON.stringify(this.delSwitchTags))
        axiosi.post("/admin/article/updArticleInfor", form).then(res => {
            if (res.status === 200) {
                window.toast.success("修改成功")
            }
        })
    }

    protected renderContent(): TemplateResult {
        return html`
            <div class="flex flex-col items-center gap-y-5">
                <label class="input">
                    Title
                    <input @input=${(e: Event) => { this.updInfor.title = (e.currentTarget as HTMLTextAreaElement).value }} .value="${this.updInfor.title}" type="text" class="grow" />
                </label>
                <textarea @input=${(e: Event) => { this.updInfor.description = (e.currentTarget as HTMLTextAreaElement).value }} .value="${this.updInfor.description}" class="textarea" placeholder="描述"></textarea>
                <div class="flex gap-2">
                    <input @click=${() => { this.updInfor.status = "draft" }} ?checked=${this.updInfor.status === "draft"} type="radio" name="radio-4" class="radio radio-primary" /><p>草稿</p>
                    <input @click=${() => { this.updInfor.status = "published" }} ?checked=${this.updInfor.status === "published"} type="radio" name="radio-4" class="radio radio-primary" /><p>发布</p>
                    <input @click=${() => { this.updInfor.status = "archived" }} ?checked=${this.updInfor.status === "archived"} type="radio" name="radio-4" class="radio radio-primary" /><p>归档</p>
                    <input @click=${() => { this.updInfor.status = "hide" }} ?checked=${this.updInfor.status === "hide"} type="radio" name="radio-4" class="radio radio-primary" /><p>隐藏</p>
                </div>
                <div class="flex flex-wrap gap-2 p-2">
            ${this.allTags.map(tag => html`
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
                    ${tag.isEditing ? "badge-primary" : "badge-outline hover:badge-primary"}
                "
                >
                    <span>${tag.name}${tag.status === `inactive` ? ` (已禁用)` : ``}</span>
                    <span class="ml-1 opacity-70 text-xs">
                        ${tag.count}
                    </span>
                </button>
            `)}
        </div>
                <div class="action">
                    <button @click=${() => { this.submit() }} class="btn btn-primary">提交</button>
                </div>
            </div>
        `;
    }
    toggleTag(tag: TagEditItem) {
        if (!tag.isEditing && tag.status === "inactive") {
            window.toast.error("该标签已被禁用，无法使用")
            return
        }
        tag.isEditing = !tag.isEditing
        if (tag.isEditing) {
            const item = this.delSwitchTags.find(item => item === tag.id)
            if (item === undefined) {
                this.newSwitchTags = [...this.newSwitchTags, tag.id]
            } else {
                this.delSwitchTags = this.delSwitchTags.filter(item => item !== tag.id)
            }
        } else {
            const item = this.newSwitchTags.find(item => item === tag.id)
            if (item === undefined) {
                this.delSwitchTags = [...this.delSwitchTags, tag.id]
            } else {
                this.newSwitchTags = this.newSwitchTags.filter(item => item !== tag.id)
            }
        }
        console.log(this.newSwitchTags, this.delSwitchTags)
    }
}