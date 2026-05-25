import { html, LitElement } from "lit";
import type { Constructor } from "../type/constructor";

type AlertType = "alert-success" | "alert-error" | "alert-warning"

export function ToastMixin<TBase extends Constructor<LitElement>>(Base: TBase) {
    return class extends Base {

        static properties = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...((Base as any).properties ?? {}),  // 保留 Base 已有的 properties
            toastMessage: { type: String, state: true },
            toastType: { type: String, state: true },
        };

        toastMessage: string | null = null

        toastType: AlertType | null = null

        private toastTimer?: number;

        protected showToast(message: string, type: AlertType) {
            this.toastMessage = message;
            this.toastType = type;

            clearTimeout(this.toastTimer);

            // 3秒后自动隐藏提示
            this.toastTimer = setTimeout(() => {
                this.toastMessage = '';
            }, 3000);
        }

        renderToast() {
            return html`
        <!-- DaisyUI 提示信息 -->
        ${this.toastMessage && html`
            <div class="toast toast-top toast-center">
                <div class="alert ${this.toastType}">
                    <span>${this.toastMessage}</span>
                </div>
            </div>
        `}
        `
        }
    }
}