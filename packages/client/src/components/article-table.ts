import { html, css, type TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DaisyUIElement } from './daisy-ui-element';
import type { AdminArticle, AdminArticleFile } from '../type/admin';

import { PreviewType } from '../type/admin';

import 'iconify-icon';
import '../components/modal/text_preview_modal'
import '../components/modal/image-preview-modal'
import '../components/modal/audio-preview-modal'
import '../components/modal/video-preview-modal'
import { truncateString } from '../utils/string_util';

const testArticleFiles = [
    {
        id: "file1",
        uuid: "uuid-1",
        suffix: "md",
        name: "ok.md",
        previewType: PreviewType.TEXT,
        previewPath: "../../public/sandbox/article/ok.md",
        size: "1MB",
        filePath: "../../public/sandbox/article/ok.md",
        relativePath: "file1.md",
        articleId: "1"
    },
    {
        id: "file3",
        uuid: "uuid-3",
        suffix: "png",
        name: "{DCED1AA7-4E33-4ab1-AC7A-A98551AE0A53}.png",
        previewType: PreviewType.IMAGE,
        previewPath: "../../public/sandbox/article/{DCED1AA7-4E33-4ab1-AC7A-A98551AE0A53}.png",
        size: "500KB",
        filePath: "../../public/sandbox/article/{DCED1AA7-4E33-4ab1-AC7A-A98551AE0A53}.png",
        relativePath: "file3.png",
        articleId: "1"
    },
    {
        id: "file4",
        uuid: "uuid-4",
        suffix: "png",
        name: "~[RQIP3[K4S[DW4CGT1[AFC.png",
        previewType: PreviewType.IMAGE,
        previewPath: "../../public/sandbox/article/~[RQIP3[K4S[DW4CGT1[AFC.png",
        size: "300KB",
        filePath: "../../public/sandbox/article/~[RQIP3[K4S[DW4CGT1[AFC.png",
        relativePath: "file4.png",
        articleId: "1"
    },
    {
        id: "file5",
        uuid: "uuid-5",
        suffix: "jpg",
        name: "0141ae5b67c0aba801215c8ff45037.jpg@2o.jpg",
        previewType: PreviewType.IMAGE,
        previewPath: "../../public/sandbox/article/0141ae5b67c0aba801215c8ff45037.jpg@2o.jpg",
        size: "500KB",
        filePath: "../../public/sandbox/article/0141ae5b67c0aba801215c8ff45037.jpg@2o.jpg",
        relativePath: "file5.jpg",
        articleId: "1"
    },
    {
        id: "file6",
        uuid: "uuid-6",
        suffix: "mp3",
        name: "958ti-t3tlp.mp3",
        previewType: PreviewType.AUDIO,
        previewPath: "../../public/sandbox/article/958ti-t3tlp.mp3",
        size: "3MB",
        filePath: "../../public/sandbox/article/958ti-t3tlp.mp3",
        relativePath: "file6.mp3",
        articleId: "1"
    },
    {
        id: "file7",
        uuid: "uuid-7",
        suffix: "mkv",
        name: "Samsung 4K Hdr 60 Fps h264.mkv",
        previewType: PreviewType.VIDEO,
        previewPath: "../../public/sandbox/article/Samsung 4K Hdr 60 Fps h264.mkv",
        size: "20MB",
        filePath: "../../public/sandbox/article/Samsung 4K Hdr 60 Fps h264.mkv",
        relativePath: "file7.mkv",
        articleId: "1"
    },
    {
        id: "file2",
        uuid: "uuid-2",
        suffix: "md",
        name: "测试文章 2",
        previewType: PreviewType.TEXT,
        previewPath: "",
        size: "2MB",
        filePath: "/path/to/file2.md",
        relativePath: "file2.md",
        articleId: "2"
    }
]

// @customElement("article-table")
// export class ArticleTable extends DaisyUIElement {
//     static defaultStyles = css`
//         /* Styles go here */
//     `;

//     @property({ type: Array })
//     articles: AdminArticle[] = [];

//     @state()
//     articleFiles: Map<string, AdminArticleFile[]> = new Map([
//         ["1", testArticleFiles.filter(file => file.articleId === "1")],
//         ["2", testArticleFiles.filter(file => file.articleId === "2")]
//     ]);

//     selectedFilePath: string = "";

//     @state()
//     textPreviewModalOpen: boolean = false;
//     @state()
//     imagePreviewModalOpen: boolean = false;
//     @state()
//     audioPreviewModalOpen: boolean = false;
//     @state()
//     videoPreviewModalOpen: boolean = false;

//     constructor() {
//         super();
//         console.log("Article: ", this.articles);
//     }

//     render() {
//         const iconCompute = (suffix: string) => {
//             suffix = suffix.charAt(0) === "." ? suffix.slice(1) : suffix;
//             return `vscode-icons:file-type-${suffixIconMap[suffix] ?? "default"}`
//         };
//         const articleStatusElementMap: Record<string, TemplateResult> = {
//             published: html`<span class="badge badge-success">已发布</span>`,
//             draft: html`<span class="badge badge-warning">草稿</span>`,
//             archived: html`<span class="badge badge-secondary">已归档</span>`
//         };
//         console.log("Article: ", this.articles);
//         return html`
//     <div class="relative flex flex-row justify-between">
//         <div class="overflow-x-auto overflow-y-auto max-h-[calc(100vh-100px)]" id="table-scroll-container">
//             <table class="table w-full table-fixed">
//                 <thead>
//                     <tr>
//                         <th>标题</th>
//                         <th>描述</th>
//                         <th>标签</th>
//                         <th>状态</th>
//                         <th>创建时间</th>
//                         <th>更新时间</th>
//                         <th>浏览量</th>
//                         <th>字数</th>
//                         <th>操作</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${this.articles.map((article) => html`
//                         <tr id="table-row-${article.id}" class="bg-base-200 hover:bg-base-300 transition-colors duration-200">
//                             <td>${truncateString(article.title, 10)}</td>
//                             <td>${truncateString(article.description, 20)}</td>
//                             <td>${article.tags.join(", ")}</td>
//                             <td>${articleStatusElementMap[article.status]}</td>
//                             <td>${article.createdAt}</td>
//                             <td>${article.updatedAt}</td>
//                             <td>${article.views}</td>
//                             <td>${article.wordCount}</td>
//                             <td class="flex flex-row space-x-2 h-full items-center">
//                                 <button class="btn btn-primary" @click=${() => this._editArticle(article.id)}>编辑</button>
//                                 <button class="btn btn-secondary" @click=${() => this._deleteArticle(article.id)}>删除</button>
//                             </td>
//                         </tr>
//                         <tr>
//                             <td colspan="8">
//                                 <div
//                                     id="file-arrow-${article.id}"
//                                     @click=${() => { this.switchFileList(article.id); this.LoadingFilesForArticle(article.id); }}
//                                     style="margin-left: 10px; margin-top: 5px;width: 20px; height: 20px; cursor: pointer;"
//                                 >
//                                     <svg
//                                         class="w-4 h-4 transition-transform duration-200"
//                                         xmlns="http://www.w3.org/2000/svg"
//                                         fill="none"
//                                         viewBox="0 0 24 24"
//                                         stroke="currentColor"
//                                     >
//                                         <path
//                                             stroke-linecap="round"
//                                             stroke-linejoin="round"
//                                             stroke-width="2"
//                                             d="M9 5l7 7-7 7"
//                                         />
//                                     </svg>
//                                 </div>

//                                 <div
//                                     id="file-list-${article.id}"
//                                     class="overflow-x-auto hidden mt-2"
//                                 >
//                                     <table class="table w-full">
//                                         <thead>
//                                             <tr>
//                                                 <th>文件名</th>
//                                                 <th>预览</th>
//                                                 <th>大小</th>
//                                                 <th>后缀</th>
//                                                 <th>相对路径</th>
//                                                 <th>操作</th>
//                                             </tr>
//                                         </thead>

//                                         <tbody>
//                                             ${this.articleFiles.get(article.id)?.map(file => html`
//                                             <tr>
//                                                 <td>${file.name}</td>
//                                                 <td><div  @click="${() => this.previewFile(file.previewPath, file.previewType)}"><iconify-icon height="40" icon="${iconCompute(file.suffix.toLowerCase())}"></iconify-icon></div></td>
//                                                 <td>${file.size}</td>
//                                                 <td>${file.suffix}</td>
//                                                 <td>${file.relativePath}</td>
//                                                 <td>
//                                                     <button class="btn btn-secondary" @click=${() => this._deleteArticleFile(article.id, file.id)}>删除</button>
//                                                 </td>
//                                             </tr>
//                                             `)}
//                                         </tbody>
//                                     </table>
//                                 </div>
//                             </td>
//                         </tr>
//                     `)}
//                 </tbody>
//             </table>
//         </div>
//         <div class="base-100 flex flex-col justify-center items-center backdrop-blur-sm border-l border-gray-200 px-2 py-4 select-none sticky top-0 right-0 h-[calc(100vh-280px)]">
//             ${this.articles.map((article, index) => html`
//             <button 
//                 @click="${() => this.scrollToRow(article.id)}"
//                 class="w-6 h-6 flex items-center justify-center my-0.5 text-xs font-semibold rounded-full hover:bg-blue-500 hover:text-white active:scale-95 transition-all duration-150"
//                 style="cursor: pointer;"
//             >
//                 ${index + 1}
//             </button>
//             `)}
//         </div>
//     </div>

//     ${this.textPreviewModalOpen ? html`<text-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.textPreviewModalOpen} @modal-closed=${() => this.textPreviewModalOpen = false}></text-preview-modal>` : nothing}
//     ${this.imagePreviewModalOpen ? html`<image-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.imagePreviewModalOpen} @modal-closed=${() => this.imagePreviewModalOpen = false}></image-preview-modal>` : nothing}
//     ${this.audioPreviewModalOpen ? html`<audio-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.audioPreviewModalOpen} @modal-closed=${() => this.audioPreviewModalOpen = false}></audio-preview-modal>` : nothing}
//     ${this.videoPreviewModalOpen ? html`<video-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.videoPreviewModalOpen} @modal-closed=${() => this.videoPreviewModalOpen = false}></video-preview-modal>` : nothing}
//         `;
//     }
@customElement("article-table")
export class ArticleTable extends DaisyUIElement {
    static defaultStyles = css`
        /* Styles go here */
        /* 添加一个自定义滚动条样式，让移动端横向滚动更优雅 */
        .custom-scrollbar::-webkit-scrollbar {
            height: 6px;
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: oklch(var(--bc) / 0.2);
            border-radius: 10px;
        }
    `;

    @property({ type: Array })
    articles: AdminArticle[] = [];

    @state()
    articleFiles: Map<string, AdminArticleFile[]> = new Map([
        // 这里只是为了演示，实际应用中建议为空，靠点击加载
        ["1", testArticleFiles.filter(file => file.articleId === "1")],
        ["2", testArticleFiles.filter(file => file.articleId === "2")]
    ]);

    selectedFilePath: string = "";

    @state() textPreviewModalOpen: boolean = false;
    @state() imagePreviewModalOpen: boolean = false;
    @state() audioPreviewModalOpen: boolean = false;
    @state() videoPreviewModalOpen: boolean = false;

    constructor() {
        super();
    }

    render() {
        const iconCompute = (suffix: string) => {
            suffix = suffix.charAt(0) === "." ? suffix.slice(1) : suffix;
            return `vscode-icons:file-type-${suffixIconMap[suffix] ?? "default"}`;
        };

        const articleStatusElementMap: Record<string, TemplateResult> = {
            published: html`<span class="badge badge-success badge-sm md:badge-md">已发布</span>`,
            draft: html`<span class="badge badge-warning badge-sm md:badge-md">草稿</span>`,
            archived: html`<span class="badge badge-secondary badge-sm md:badge-md">已归档</span>`
        };

        return html`
    <div class="relative flex flex-row w-full h-full">
        <div class="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar max-h-[calc(100vh-100px)] w-full" id="table-scroll-container">
            <table class="table table-auto w-full">
                <thead>
                    <tr>
                        <th class="w-8"></th> <th class="whitespace-nowrap">标题</th>
                        <th class="hidden lg:table-cell">描述</th>
                        <th class="hidden md:table-cell">标签</th>
                        <th class="whitespace-nowrap">状态</th>
                        <th class="hidden xl:table-cell">创建时间</th>
                        <th class="hidden xl:table-cell">更新时间</th>
                        <th class="hidden sm:table-cell">浏览量</th>
                        <th class="hidden sm:table-cell">字数</th>
                        <th class="whitespace-nowrap text-center">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.articles.map((article) => html`
                        <tr id="table-row-${article.id}" class="bg-base-100 hover:bg-base-200 transition-colors duration-200">
                            <td class="w-8 px-2">
                                <div
                                    id="file-arrow-${article.id}"
                                    @click=${() => { this.switchFileList(article.id); this.LoadingFilesForArticle(article.id); }}
                                    class="w-6 h-6 flex items-center justify-center cursor-pointer rounded-full hover:bg-base-300 transition-colors"
                                >
                                    <svg class="w-4 h-4 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </td>
                            <td class="font-medium whitespace-nowrap min-w-[120px]">${truncateString(article.title, 12)}</td>
                            <td class="hidden lg:table-cell text-sm opacity-70">${truncateString(article.description, 20)}</td>
                            <td class="hidden md:table-cell text-sm">${article.tags.join(", ")}</td>
                            <td class="whitespace-nowrap">${articleStatusElementMap[article.status]}</td>
                            <td class="hidden xl:table-cell text-xs opacity-70">${article.createdAt}</td>
                            <td class="hidden xl:table-cell text-xs opacity-70">${article.updatedAt}</td>
                            <td class="hidden sm:table-cell">${article.views}</td>
                            <td class="hidden sm:table-cell">${article.wordCount}</td>
                            
                            <td class="whitespace-nowrap flex flex-row gap-2 justify-center items-center h-full pt-3">
                                <button class="btn btn-sm btn-primary" @click=${() => this._editArticle(article.id)}>编辑</button>
                                <button class="btn btn-sm btn-ghost text-error" @click=${() => this._deleteArticle(article.id)}>删除</button>
                            </td>
                        </tr>

                        <tr class="bg-base-200/50">
                            <td colspan="10" class="p-0 border-none">
                                <div id="file-list-${article.id}" class="overflow-x-auto custom-scrollbar hidden bg-base-200/50 px-4 py-2">
                                    <table class="table table-sm w-full bg-base-100 rounded-box shadow-sm mb-4">
                                        <thead>
                                            <tr>
                                                <th class="whitespace-nowrap">文件名</th>
                                                <th>预览</th>
                                                <th class="hidden sm:table-cell">大小</th>
                                                <th class="hidden md:table-cell">后缀</th>
                                                <th class="hidden lg:table-cell">相对路径</th>
                                                <th class="text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${this.articleFiles.get(article.id)?.map(file => html`
                                            <tr class="hover:bg-base-200 transition-colors">
                                                <td class="truncate max-w-[150px] md:max-w-xs" title="${file.name}">${truncateString(file.name, 50)}</td>
                                                <td>
                                                    <button class="btn btn-square btn-ghost btn-sm" @click="${() => this.previewFile(file.previewPath, file.previewType)}">
                                                        <iconify-icon height="24" icon="${iconCompute(file.suffix.toLowerCase())}"></iconify-icon>
                                                    </button>
                                                </td>
                                                <td class="hidden sm:table-cell text-xs">${file.size}</td>
                                                <td class="hidden md:table-cell">
                                                    <span class="badge badge-outline badge-sm">${file.suffix}</span>
                                                </td>
                                                <td class="hidden lg:table-cell text-xs opacity-60 font-mono">${file.relativePath}</td>
                                                <td class="text-right">
                                                    <button class="btn btn-xs btn-error btn-outline" @click=${() => this._deleteArticleFile(article.id, file.id)}>删除</button>
                                                </td>
                                            </tr>
                                            `)}
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    `)}
                </tbody>
            </table>
        </div>

        <div class="hidden md:flex flex-col justify-center items-center bg-base-100/80 backdrop-blur-sm border-l border-base-300 px-1 py-4 select-none sticky top-0 right-0 h-[calc(100vh-100px)] z-10 w-8">
            ${this.articles.map((article, index) => html`
            <button 
                @click="${() => this.scrollToRow(article.id)}"
                class="w-6 h-6 flex items-center justify-center my-1 text-xs font-semibold rounded-full hover:bg-primary hover:text-primary-content active:scale-95 transition-all duration-150 cursor-pointer"
            >
                ${index + 1}
            </button>
            `)}
        </div>
    </div>

    ${this.textPreviewModalOpen ? html`<text-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.textPreviewModalOpen} @modal-closed=${() => this.textPreviewModalOpen = false}></text-preview-modal>` : nothing}
    ${this.imagePreviewModalOpen ? html`<image-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.imagePreviewModalOpen} @modal-closed=${() => this.imagePreviewModalOpen = false}></image-preview-modal>` : nothing}
    ${this.audioPreviewModalOpen ? html`<audio-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.audioPreviewModalOpen} @modal-closed=${() => this.audioPreviewModalOpen = false}></audio-preview-modal>` : nothing}
    ${this.videoPreviewModalOpen ? html`<video-preview-modal .path=${this.selectedFilePath} ?isOpen=${this.videoPreviewModalOpen} @modal-closed=${() => this.videoPreviewModalOpen = false}></video-preview-modal>` : nothing}
        `;
    }

    // ... 原有逻辑方法保持不变 (previewFile, LoadingFilesForArticle, _deleteArticleFile, 等)

    switchFileList(id: string) {
        // 使用 this.renderRoot 确保在 shadow DOM 中准确找到元素
        const fileList = this.renderRoot.querySelector(`#file-list-${id}`) as HTMLDivElement;
        const arrow = this.renderRoot.querySelector(`#file-arrow-${id} svg`) as HTMLElement;

        if (!fileList || !arrow) return;

        // 使用 Tailwind 动画效果替代简单的 display:none
        if (fileList.classList.contains("hidden")) {
            fileList.classList.remove("hidden");
            // 简单的淡入效果
            fileList.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
            arrow.classList.add("rotate-90");
        } else {
            arrow.classList.remove("rotate-90");
            fileList.classList.add("hidden");
        }
    }

    scrollToRow(id: string) {
        const rowElement = this.renderRoot.querySelector(`#table-row-${id}`) as HTMLElement;
        const scrollContainer = this.renderRoot.querySelector('#table-scroll-container') as HTMLElement;

        if (rowElement && scrollContainer) {
            const top = rowElement.getBoundingClientRect().top
                - scrollContainer.getBoundingClientRect().top
                + scrollContainer.scrollTop;
            scrollContainer.scrollTo({
                top: top,
                behavior: 'smooth'
            });
        }
    }
    previewFile(relativePath: string, previewType: string) {
        console.log("Previewing file: ", relativePath, previewType);
        if (!relativePath) return;
        this.selectedFilePath = relativePath;

        switch (previewType) {
            case PreviewType.IMAGE:
                this.imagePreviewModalOpen = true;
                break;
            case PreviewType.VIDEO:
                this.videoPreviewModalOpen = true;
                break;
            case PreviewType.AUDIO:
                this.audioPreviewModalOpen = true;
                break;
            case PreviewType.TEXT:
                this.textPreviewModalOpen = true;
                break;
        }
    }
    LoadingFilesForArticle(id: string) {
        if (this.articleFiles.has(id)) return;

        // 模拟加载文件数据
        setTimeout(() => {
            const files = testArticleFiles.filter(file => file.articleId === id);
            this.articleFiles.set(id, files);
            this.requestUpdate();
        }, 500);
    }
    private _deleteArticleFile(id: string, id1: string) {
        throw new Error('Method not implemented.');
    }
    _editArticle(id: string) {
        throw new Error('Method not implemented.');
    }
    _deleteArticle(id: string) {
        throw new Error('Method not implemented.');
    }
}



const suffixIconMap: Record<string, string> = {
    // ===== Web =====
    html: "html",
    htm: "html",
    css: "css",
    scss: "sass",
    sass: "sass",
    less: "less",
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "reactjs",
    ts: "typescript",
    mts: "typescript",
    cts: "typescript",
    tsx: "reactts",
    vue: "vue",
    svelte: "svelte",
    astro: "astro",
    php: "php",

    // ===== Backend =====
    java: "java",
    kt: "kotlin",
    kts: "kotlin",
    groovy: "groovy",
    scala: "scala",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    dart: "dart",
    lua: "lua",
    pl: "perl",
    r: "r",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    ps1: "powershell",

    // ===== Config =====
    json: "json",
    json5: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "config",
    ini: "config",
    env: "tune",
    conf: "config",
    properties: "config",
    xml: "xml",

    // ===== Database =====
    sql: "sql",
    db: "database",
    sqlite: "sqlite",

    // ===== Markdown / Docs =====
    md: "markdown",
    mdx: "mdx",
    txt: "text",
    pdf: "pdf",
    doc: "word",
    docx: "word",
    xls: "excel",
    xlsx: "excel",
    csv: "table",
    ppt: "powerpoint",
    pptx: "powerpoint",

    // ===== Image =====
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    svg: "svg",
    ico: "favicon",
    bmp: "image",

    // ===== Audio =====
    mp3: "audio",
    wav: "audio",
    flac: "audio",
    ogg: "audio",

    // ===== Video =====
    mp4: "video",
    mov: "video",
    avi: "video",
    mkv: "video",
    webm: "video",

    // ===== Archive =====
    zip: "zip",
    rar: "zip",
    "7z": "zip",
    tar: "zip",
    gz: "zip",

    // ===== DevOps =====
    dockerfile: "docker",
    dockerignore: "docker",
    gitignore: "git",
    gitattributes: "git",
    gitmodules: "git",
    lock: "lock",
    npmrc: "npm",
    yarnrc: "yarn",
    pnpmfile: "pnpm",

    // ===== Framework / Build =====
    gradle: "gradle",
    pom: "maven",
    bat: "windows",
    exe: "exe",
    apk: "android",
    ipa: "apple",

    // ===== Cloudflare / Workers =====
    wrangler: "cloudflare",
};