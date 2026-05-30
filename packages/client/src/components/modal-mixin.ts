import { LitElement, html, type TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import type { Constructor } from '../type/constructor';
import { watchMobileState } from '../utils/device';

export const ModalMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class ModalElement extends superClass {
    // --- 外部/内部控制属性 ---
    @property({ type: Boolean, reflect: true }) isOpen = false;
    @property({ type: String }) modalTitle = '';

    get computedModalWidth(): string | null {
      return null;
    }

    get computedModalHeight(): string | null {
      return null;
    }

    @state()
    mobile = { value: false, loading: false }

    // ✨ 额外扩展: 请求时的 Loading 状态，非常适合配合 Axios 使用
    @property({ type: Boolean }) isLoading = false;

    @query('dialog') dialog!: HTMLDialogElement;

    connectedCallback(): void {
      super.connectedCallback();
      watchMobileState((isMobile) => {
        this.mobile = {
          value: isMobile,
          loading: true
        }
      });
    }

    // --- 生命周期拦截 ---
    updated(changedProperties: Map<string, unknown>) {
      super.updated?.(changedProperties);
      if (changedProperties.has('isOpen')) {
        if (this.isOpen) {
          if (this.isOpen && !this.dialog.open) {
            this.dialog.showModal();
          } // 唤起原生 dialog
          this.onModalOpen();       // 触发子类的钩子
        } else {
          if (!this.isOpen && this.dialog.open) {
            this.dialog.close();
          }
          this.onModalClose();
        }
      }
    }

    // --- 预留给子类重写的方法 (类似虚函数) ---
    protected renderContent(): TemplateResult {
      return html`<p>请在子类中重写 renderContent()</p>`;
    }

    protected renderFooter(): TemplateResult | typeof undefined {
      // 预留底部操作区 (取消/确认按钮)，子类可选择性重写
      return undefined;
    }

    protected onModalOpen() {
      // 默认空实现，子类重写用于：模态框打开时初始化数据、发起 Axios 请求等
    }

    protected onModalClose() {
      // 默认空实现，子类重写用于：清理表单、中断 Axios 请求等
    }

    // --- 内部关闭逻辑 ---
    private _handleClose(e?: Event) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.isOpen = false;
      // 向上派发事件，通知父组件已关闭（如果外部需要监听的话）
      this.dispatchEvent(new CustomEvent('modal-closed', { bubbles: true, composed: true }));
    }

    private _onNativeClose() {
      if (this.isOpen) {
        this.isOpen = false;
        this.onModalClose();
        this.dispatchEvent(
          new CustomEvent('modal-closed', {
            bubbles: true,
            composed: true
          })
        );
      }
    }

    createRenderRoot() {
      return this;
    }

    render() {
      // 动态控制宽高，同时利用 DaisyUI 自身的响应式类 (w-11/12 max-w-5xl)
      const boxStyle = `
        ${this.computedModalWidth ? `width: ${this.computedModalWidth}; max-width: none;` : ''}
        ${this.computedModalHeight ? `height: ${this.computedModalHeight}; max-height: none;` : ''}
      `;

      return html`
        <dialog class="modal" @close="${this._onNativeClose}">
          <div class="modal-box relative flex flex-col" style="${boxStyle}">
            
            <button 
              class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" 
              @click="${this._handleClose}">✕
            </button>

            ${this.modalTitle ? html`
              <h3 class="font-bold text-lg mb-4 text-base-content">${this.modalTitle}</h3>
            ` : ''}

            <div class="flex-1 overflow-y-auto relative h-full">
              ${this.isLoading
          ? html`
                    <div class="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-50 z-10">
                      <span class="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                  `
          : ''}
              ${this.renderContent()}
            </div>

            ${this.renderFooter() ? html`
              <div class="modal-action mt-4">
                ${this.renderFooter()}
              </div>
            ` : ''}

          </div>
          
          <form method="dialog" class="modal-backdrop">
            <button @click="${this._handleClose}">close</button>
          </form>
        </dialog>
      `;
    }
  }

  return ModalElement;
};