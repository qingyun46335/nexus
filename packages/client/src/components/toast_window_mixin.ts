import { type LitElement } from "lit";
import type { Constructor } from "../type/constructor";
import { state } from "lit/decorators.js";
import { createRef, type Ref } from "lit/directives/ref.js";
import { MyToast } from "./my-toast";

let _toastDom: MyToast | undefined;
const pendingCalls: Array<() => void> = [];

window.toast = {
    info: (msg) => _toastDom ? _toastDom.show(msg, "info") : pendingCalls.push(() => _toastDom!.show(msg, "info")),
    success: (msg) => _toastDom ? _toastDom.show(msg, "success") : pendingCalls.push(() => _toastDom!.show(msg, "success")),
    error: (msg) => _toastDom ? _toastDom.show(msg, "error") : pendingCalls.push(() => _toastDom!.show(msg, "error")),
    warning: (msg) => _toastDom ? _toastDom.show(msg, "warning") : pendingCalls.push(() => _toastDom!.show(msg, "warning")),
};

export const ToastWindowMixin = <T extends Constructor<LitElement>>(superClass: T) => {
    class ToastElement extends superClass {

        @state()
        toastMax: number = 10;

        toastRef: Ref<MyToast> = createRef();

        toastLoading() {
            const toastDom = this.toastRef.value;
            if (!toastDom) return;

            // 等待自定义元素升级完成
            customElements.whenDefined("my-toast").then(() => {
                _toastDom = toastDom as MyToast;
                pendingCalls.forEach(fn => fn());
                pendingCalls.length = 0;
                console.log("已注册的自定义元素:", customElements.get("my-toast"));

            });
        }

        info(msg: string) {
            const toastDom = this.toastRef.value;
            if (!toastDom) return;
            toastDom.show(msg, "info")
        }

        success(msg: string) {
            const toastDom = this.toastRef.value;
            if (!toastDom) return;
            toastDom.show(msg, "success")
        }

        error(msg: string) {
            const toastDom = this.toastRef.value;
            if (!toastDom) return;
            toastDom.show(msg, "error")
        }

        warning(msg: string) {
            const toastDom = this.toastRef.value;
            if (!toastDom) return;
            toastDom.show(msg, "warning")
        }

        async firstUpdated() {

            if (!document.querySelector("my-toast#global-toast")) {
                const toast = document.createElement("my-toast");
                toast.id = "global-toast";
                document.body.appendChild(toast);
                _toastDom = toast as MyToast;
            }

            await this.updateComplete;
            this.toastLoading();
        }

    }
    return ToastElement
}