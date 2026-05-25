import { html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { DaisyUIElement } from "./daisy-ui-element";
import { ToastMixin } from "./toast-element";

interface UploadFile {
  id: string;
  file: File;
  relativePath: string; // 核心：保留层级结构
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
}

@customElement("blog-uploader")
export class BlogUploader extends ToastMixin(DaisyUIElement) {
  // 禁用 Shadow DOM，直接使用 Light DOM 以完美继承 DaisyUI 的主题和 Tailwind 类
  protected createRenderRoot() {
    return this;
  }

  @property({ type: Boolean })
  isMobile = false; // 由外部控制的移动端状态

  @state()
  private _files: UploadFile[] = [];

  @state()
  private _isDragging = false;

  @state()
  private _globalProgress = 0;

  @state()
  private _isUploading = false;

  private _fileMaxLength = 30;

  // 格式化文件大小
  private formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // 生成唯一ID
  private generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  // 处理通用文件输入（点击选择文件）
  private handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    this.showToast(
      `文件数量超出，总计：${input.files.length}。应当在${this._fileMaxLength}以下`,
      "alert-warning",
    );
    this.addFiles(Array.from(input.files));
    input.value = ""; // Reset
  }

  // 添加文件并提取相对路径
  private addFiles(files: File[]) {
    const newUploads = files
      .filter((file) => !file.name.startsWith(".")) // 过滤 .DS_Store 等隐藏文件
      .map((file) => ({
        id: this.generateId(),
        file,
        // webkitRelativePath 存在说明是通过文件夹选择进来的，否则就是单文件直接取 name
        relativePath: file.webkitRelativePath || file.name,
        size: file.size,
        status: "pending" as const,
        progress: 0,
      }));

    this._files = [...this._files, ...newUploads];
  }

  // 处理拖拽
  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    this._isDragging = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    this._isDragging = false;
  }

  private async handleDrop(e: DragEvent) {
    e.preventDefault();
    this._isDragging = false;
    if (!e.dataTransfer?.items) return;

    const items = Array.from(e.dataTransfer.items);
    const filesPromises: Promise<void>[] = [];

    for (const item of items) {
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          filesPromises.push(this.traverseFileTree(entry));
        }
      }
    }

    await Promise.all(filesPromises);
  }

  // 核心：递归遍历拖拽进来的文件夹目录树
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private traverseFileTree(item: any, path = ""): Promise<void> {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          if (!file.name.startsWith(".")) {
            this._files = [
              ...this._files,
              {
                id: this.generateId(),
                file,
                relativePath: path + file.name,
                size: file.size,
                status: "pending",
                progress: 0,
              },
            ];
          }
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: unknown[]) => {
          for (let i = 0; i < entries.length; i++) {
            await this.traverseFileTree(entries[i], path + item.name + "/");
          }
          resolve();
        });
      }
    });
  }

  // 移除未上传的文件
  private removeFile(id: string) {
    if (this._isUploading) return;
    this._files = this._files.filter((f) => f.id !== id);
  }

  // 模拟上传逻辑
  private async uploadFiles() {
    if (this._files.length === 0 || this._isUploading) return;

    if (this._files.length > this._fileMaxLength) {
      this.showToast(
        `文件数量超出，总计：${this._files.length}。应当在${this._fileMaxLength}以下`,
        "alert-warning",
      );
      return;
    }

    this._isUploading = true;
    this._globalProgress = 0;

    try {
      /**
       * 1. prepare
       */
      const prepareResp = await fetch(`/api/article/prepare`, {
        method: "POST",
        headers: {
          Authorization: window.localStorage.getItem("token")
            ? `Basic ${window.localStorage.getItem("token")}`
            : "",
        },
        body: new URLSearchParams({
          filesNum: String(this._files.length),
        }),
      });

      if (!prepareResp.ok) {
        throw new Error("prepare失败");
      }

      const prepareJson = await prepareResp.json();

      /**
       * 根据你 RespMap 的结构自己调整
       */
      const uploadId = prepareJson.value;

      if (!uploadId) {
        throw new Error("uploadId不存在");
      }

      /**
       * 2. upload files
       */
      const pendingFiles = this._files.filter((f) => f.status !== "success");

      let completed = 0;

      for (let i = 0; i < pendingFiles.length; i++) {
        const current = pendingFiles[i];

        const fileIndex = this._files.findIndex((f) => f.id === current.id);

        this._files[fileIndex].status = "uploading";
        this._files[fileIndex].progress = 0;
        this._files = [...this._files];

        try {
          /**
           * relativePath 适配
           */
          const normalizedRelativePath = current.relativePath
            .replaceAll("\\", "/")
            .replace(/^\.?\//, "");

          const suffix = current.file.name.split(".").pop() || "";

          const meta = {
            name: current.file.name,
            relativePath: normalizedRelativePath,
            suffix,
          };

          const formData = new FormData();

          formData.append("uploadId", uploadId);

          formData.append("meta", JSON.stringify(meta));

          formData.append("file", current.file);

          /**
           * XMLHttpRequest 才能拿 upload progress
           */
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            if (window.localStorage.getItem("token")) {
              xhr.setRequestHeader(
                "Authorization",
                `Basic ${window.localStorage.getItem("token")}`,
              );
            }

            xhr.open("POST", `/api/article/upload`);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);

                this._files[fileIndex].progress = progress;

                this._files = [...this._files];
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`上传失败: ${xhr.responseText}`));
              }
            };

            xhr.onerror = () => {
              reject(new Error("网络错误"));
            };

            xhr.send(formData);
          });

          this._files[fileIndex].status = "success";
          this._files[fileIndex].progress = 100;

          completed++;

          this._globalProgress = Math.round(
            (completed / pendingFiles.length) * 100,
          );

          this._files = [...this._files];
        } catch (e) {
          console.error(e);

          this._files[fileIndex].status = "error";

          this._files = [...this._files];
        }
      }

      /**
       * 3. upload_after
       */
      const afterForm = new FormData();

      afterForm.append("uploadId", uploadId);

      const afterResp = await fetch(`/api/article/upload_after`, {
        method: "POST",
        headers: {
          Authorization: window.localStorage.getItem("token")
            ? `Basic ${window.localStorage.getItem("token")}`
            : "",
        },
        body: afterForm,
      });

      if (!afterResp.ok) {
        throw new Error("upload_after失败");
      }

      /**
       * 你说这个结果你自己处理
       */
      const afterJson = await afterResp.json();

      console.log(afterJson);

      // document.getElementById("modal_html")!.innerHTML = afterJson.value.html;

      this.showToast("上传完成", "alert-success");

      /**
       * 触发外部事件
       */
      this.dispatchEvent(
        new CustomEvent("upload-complete", {
          detail: {
            files: this._files,
            result: afterJson,
          },
        }),
      );
    } catch (e) {
      console.error(e);

      this.showToast(
        e instanceof Error ? e.message : "上传失败",
        "alert-error",
      );
    } finally {
      this._isUploading = false;
    }
  }

  render() {
    return html`
      <div
        class="w-full max-w-4xl mx-auto p-4 bg-base-100 text-base-content rounded-box shadow-lg"
      >
        <!-- 拖拽与操作区 -->
        <div
          class="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors 
                 ${this._isDragging
            ? "border-primary bg-primary/10"
            : "border-base-300 hover:border-primary/50"}"
          @dragover="${this.handleDragOver}"
          @dragleave="${this.handleDragLeave}"
          @drop="${this.handleDrop}"
        >
          <div class="flex flex-col items-center justify-center gap-4">
            <svg
              class="w-12 h-12 text-base-content/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <div>
              <p class="font-medium text-lg">拖拽文件或文件夹到这里</p>
              <p class="text-sm text-base-content/60 mt-1">
                支持解析完整的文件夹层级结构，过滤隐藏文件
              </p>
            </div>

            <div class="flex gap-4 mt-2">
              <button
                class="btn btn-primary btn-sm"
                @click="${() =>
                  this.querySelector<HTMLInputElement>("#fileInput")?.click()}"
              >
                选择文件
              </button>
              <button
                class="btn btn-secondary btn-sm"
                @click="${() =>
                  this.querySelector<HTMLInputElement>(
                    "#folderInput",
                  )?.click()}"
              >
                选择文件夹
              </button>
            </div>

            <!-- 隐藏的 input -->
            <input
              type="file"
              id="fileInput"
              multiple
              class="hidden"
              @change="${this.handleFileInput}"
            />
            <input
              type="file"
              id="folderInput"
              webkitdirectory
              multiple
              class="hidden"
              @change="${this.handleFileInput}"
            />
          </div>
        </div>

        <!-- 列表头部与全局进度 -->
        ${this._files.length > 0
          ? html`
              <div class="mt-6 flex justify-between items-end mb-2">
                <h3 class="font-bold text-lg">
                  待上传队列 (${this._files.length})
                </h3>
                <div class="space-x-2">
                  <button
                    class="btn btn-ghost btn-sm text-error"
                    ?disabled="${this._isUploading}"
                    @click="${() => (this._files = [])}"
                  >
                    清空
                  </button>
                  <button
                    class="btn btn-primary btn-sm"
                    ?disabled="${this._isUploading}"
                    @click="${this.uploadFiles}"
                  >
                    ${this._isUploading
                      ? html`<span
                            class="loading loading-spinner loading-xs"
                          ></span>
                          上传中...`
                      : "开始上传"}
                  </button>
                </div>
              </div>

              ${this._isUploading
                ? html`
                    <progress
                      class="progress progress-primary w-full mb-4"
                      value="${this._globalProgress}"
                      max="100"
                    ></progress>
                  `
                : nothing}

              <!-- 文件列表 (响应式适配) -->
              <div class="bg-base-200 rounded-box max-h-96 overflow-y-auto">
                ${this.isMobile
                  ? this.renderMobileList()
                  : this.renderDesktopTable()}
              </div>
            `
          : nothing}
        ${this.renderToast()}
      </div>
    `;
  }

  // 桌面端使用 Table 渲染，层级清晰
  private renderDesktopTable() {
    return html`
      <table class="table table-sm w-full">
        <thead class="bg-base-300 sticky top-0 z-10">
          <tr>
            <th>状态</th>
            <th>文件路径</th>
            <th>大小</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          ${this._files.map(
            (f) => html`
              <tr class="hover">
                <td class="w-16">${this.renderStatusIcon(f)}</td>
                <td class="max-w-xs truncate" title="${f.relativePath}">
                  ${this.renderFileName(f.relativePath)}
                </td>
                <td class="w-24 text-base-content/70">
                  ${this.formatSize(f.size)}
                </td>
                <td class="w-16 text-right">
                  <button
                    class="btn btn-ghost btn-xs text-error"
                    ?disabled="${this._isUploading || f.status === "success"}"
                    @click="${() => this.removeFile(f.id)}"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>
    `;
  }

  // 移动端使用 Flex Card 渲染，避免表格挤压
  private renderMobileList() {
    return html`
      <div class="flex flex-col divide-y divide-base-300">
        ${this._files.map(
          (f) => html`
            <div class="p-3 flex items-center justify-between gap-3">
              <div>${this.renderStatusIcon(f)}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  ${this.renderFileName(f.relativePath)}
                </div>
                <div class="text-xs text-base-content/60 mt-1 flex gap-2">
                  <span>${this.formatSize(f.size)}</span>
                  <span class="truncate opacity-70">${f.relativePath}</span>
                </div>
              </div>
              <button
                class="btn btn-circle btn-ghost btn-sm text-error shrink-0"
                ?disabled="${this._isUploading || f.status === "success"}"
                @click="${() => this.removeFile(f.id)}"
              >
                ✕
              </button>
            </div>
          `,
        )}
      </div>
    `;
  }

  // 渲染文件名高亮（对 MD 文件做特殊标记）
  private renderFileName(path: string) {
    const isMd = path.endsWith(".md");
    return html`
      <span class="flex items-center gap-2">
        ${isMd
          ? html`<span class="badge badge-info badge-sm rounded-sm">MD</span>`
          : nothing}
        <span class="${isMd ? "font-bold" : ""}">${path}</span>
      </span>
    `;
  }

  // 渲染状态徽章/进度条
  private renderStatusIcon(f: UploadFile) {
    switch (f.status) {
      case "success":
        return html`<span class="text-success flex items-center gap-1"
          ><svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path></svg
        ></span>`;
      case "uploading":
        return html`<div
          class="radial-progress text-primary"
          style="--value:${f.progress}; --size:1.2rem; --thickness: 2px;"
        ></div>`;
      case "error":
        return html`<span class="badge badge-error badge-xs">失败</span>`;
      default:
        return html`<span class="badge badge-ghost badge-xs">等待</span>`;
    }
  }
}
