import { html, css, type TemplateResult, type PropertyValues, nothing, } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ModalMixin } from '../../modal-mixin';
import { DaisyUIElement } from '../../daisy-ui-element';
import axiosi from '../../../utils/axios';
import type { TagEditItem, TagItem } from '../../../type/admin';
import "../../status-selector"
import type { StatusChangeDetail, StatusSelectorItems } from '../../status-selector';
import { classMap } from 'lit/directives/class-map.js';

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
    usageIdMap: Record<string, string> = {};

    @state()
    allTags: TagEditItem[] = [];

    @state()
    newSwitchTags: string[] = [];

    @state()
    delSwitchTags: string[] = [];

    @state()
    statusSelector: StatusSelectorItems = {}

    contentClassify: boolean = false

    @state()
    contentClassifyParams: Record<string, string> = {};

    parseMarkdownStatus: boolean = false

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
        await this.getArticleFilesByArticleId()
        await this.getParseMarkdownStatus()
    }

    async getParseMarkdownStatus() {
        await axiosi.get<{ value: number }>(`/admin/article/parseMarkdownStatus?articleId=${this.articleId}`).then(res => {
            if (res.status === 200) {
                const count = res.data.value
                if (count > 0) {
                    this.parseMarkdownStatus = true
                    this.requestUpdate()
                }
            }
        })
    }

    async getArticleFilesByArticleId() {
        await axiosi.get<{ value: StatusSelectorItems }>(`/admin/article/getArticleFilesByArticleId?articleId=${this.articleId}`).then(res => {
            if (res.status === 200) {
                this.statusSelector = res.data.value
                const result = Object.entries(this.statusSelector).filter(([, v]) => {
                    return v.value === "content"
                })
                if (result.length > 0) {
                    this.contentClassify = true
                }
            }
        })
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
                if (res.data.code === 401) {
                    window.toast.error("流程未完成，无法发布、归档")
                    return
                }
                window.toast.success("修改成功")
            }
        })
    }

    protected renderContent(): TemplateResult {
        const btnDisabledClasses = { "btn-disabled": this.updInfor.status === "published" }
        return html`
            <div class="flex flex-col items-center gap-y-5">
                <label class="input">
                    Title
                    <input @input=${(e: Event) => { this.updInfor.title = (e.currentTarget as HTMLTextAreaElement).value }} .value="${this.updInfor.title}" type="text" class="grow" />
                </label>
                <textarea @input=${(e: Event) => { this.updInfor.description = (e.currentTarget as HTMLTextAreaElement).value }} .value="${this.updInfor.description}" class="textarea min-h-64 max-h-96" placeholder="描述"></textarea>
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
        <div>
            ${this.contentClassify ? html`<div class="badge badge-info">主要内容存在</div>` : html`<div class="badge badge-warning">完全未选择主要内容</div>`}
            <status-selector @status-change=${this.statusChange} .statusOptions=${{ "content": "主要内容", "attachment": "附件", "not_specified": "未指定" }} .items=${this.statusSelector}></status-selector>
        </div>
        <div class="action">
                    <button @click=${() => { this.specified() }} class="btn btn-secondary ${classMap(btnDisabledClasses)}">指定</button>
                    
                </div>
                <div>${this.updInfor.status === "published" ? html`<p class="text-xs">请取消发布后，再进行选择</p>` : nothing}</div>
        <div>
            ${this.parseMarkdownStatus ? html`<div class="badge badge-info">文章信息解析完成 正文链接替换完成</div>` : html`<div class="badge badge-warning">文章信息可能未解析 正文链接可能未替换</div>`}
        </div>
        <div class="action">
                    <button @click=${() => { this.parseMarkdown() }} class="btn btn-accent ${classMap(btnDisabledClasses)}">解析</button>
                    
                </div>
                <div>${this.updInfor.status === "published" ? html`<p class="text-xs">请取消发布后，再进行解析</p>` : nothing}</div>
            
            </div>
            
        `;
    }
    parseMarkdown() {
        axiosi.get(`/admin/article/parseMarkdown?articleId=${this.articleId}`).then(res => {
            if (res.status === 200) {
                window.toast.success("markdown 解析完成，链接替换完成")
            }
        })
    }
    specified() {
        const form = new FormData()
        form.append("articleId", this.articleId)
        const usageMode = Object.entries(this.contentClassifyParams).filter(([, v]) => v != "not_specified").length > 0 ? "1" : "0"
        form.append("usageMode", usageMode)
        form.append("uim", JSON.stringify(this.contentClassifyParams))

        axiosi.post("/admin/article/contentClassify", form).then(res => {
            if (res.status === 200) {
                window.toast.success("文件指定用途完成")
            }
        })
    }
    statusChange(e: CustomEvent<StatusChangeDetail>) {
        this.contentClassifyParams = e.detail.params
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
    }
}