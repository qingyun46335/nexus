import { state } from "lit/decorators.js";
import axiosi from "../utils/axios";
import { ErrorLitElement } from "./error-lit-element";
import { html } from "lit";
import { ToastWindowMixin } from "./toast_window_mixin";

/**
 * AuthLitElement —— 需要身份验证的页面/组件的抽象基类
 *
 * 设计目标：
 *   在 MPA（多页应用）架构下，通过 Token 验证实现轻量级的内容保护。
 *   每个受保护页面继承此类，在组件挂载时自动向后端验证 Token，
 *   并根据验证结果决定渲染内容、未授权提示、错误提示或加载状态。
 *
 * 使用方式：
 *   1. 继承此类，实现 renderContent() 方法，填入受保护的页面内容。
 *   2. 可选：覆盖 verifyEndpoint getter，指向该页面对应的验证接口。
 *   3. 可选：覆盖 renderUnauthorized / renderError / renderLoading，自定义各状态 UI。
 *
 * 典型用法：
 *   ```ts
 *   @customElement('dashboard-page')
 *   export class DashboardPage extends AuthLitElement {
 *       protected get verifyEndpoint() { return '/api/verify/dashboard'; }
 *       protected renderContent() {
 *           return html`<dashboard-content></dashboard-content>`;
 *       }
 *   }
 *   ```
 *
 * 工作流程：
 *   connectedCallback
 *       └─ localStorage 有 token?
 *             ├─ 无 → 'unauth'（直接短路，不发请求）
 *             └─ 有 → GET verifyEndpoint
 *                       ├─ 200        → 'ok'      渲染 renderContent()
 *                       ├─ 401 / 403  → 'unauth'  渲染 renderUnauthorized()
 *                       ├─ 500        → 'error'   渲染 renderError()
 *                       └─ 异常       → 'error'
 *
 * 注意事项：
 *   - Token 存放在 localStorage，需关注 XSS 风险。
 *   - 此方案为客户端验证辅助，真正的权限控制必须由服务端 API 保证。
 *   - 受保护内容不会出现在初始 HTML 中，依赖 JS 执行后才渲染。
 */

type AuthStatus = 'loading' | 'ok' | `unauth` | 'forbidden' | 'error';

export class AuthLitElement extends ToastWindowMixin(ErrorLitElement) {

    @state() private _authStatus: AuthStatus = 'loading';

    // 子类可以覆盖这个方法来指定验证的 API 端点
    protected get verifyEndpoint(): string {
        return '/verify';
    }

    protected renderContent(): unknown {
        return html``
    };

    constructor() {
        super()

    }

    connectedCallback(): void {
        super.connectedCallback()
        this._verifyToken().then(res => {
            console.log("Token 验证结果:", res);
            this.saveRedirectUrl(res.status)
        }).catch(e => {
            console.error("Token 验证失败:", e);
            this.saveRedirectUrl(e.status)
        })

    }

    private saveRedirectUrl(status?: number) {
        if (location.pathname === "/login") {
            return;
        }

        if (!localStorage.getItem("token")) {

            localStorage.setItem(
                "redirectUrl",
                location.pathname +
                location.search +
                location.hash
            );
        } else {
            if (status && status === 401) {
                localStorage.setItem(
                    "redirectUrl",
                    location.pathname +
                    location.search +
                    location.hash
                );
            }
        }
    }

    private async _verifyToken(): Promise<{ status: number }> {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn("未找到 token，用户未认证");
            this._authStatus = 'unauth';
            // 没有 token 属于已知校验失败，抛出错误让外层 catch 捕获
            throw { status: 401 };
        }

        try {
            const res = await axiosi.get(this.verifyEndpoint);
            console.log("验证接口响应:", res);

            // 200 成功情况
            this._authStatus = "ok";
            return { status: res.status };
        } catch (e) {
            // @ts-ignore
            const status = e.response?.status || 500;
            console.error("验证接口请求失败:", e);

            // 根据状态码更新状态
            switch (status) {
                case 401: this._authStatus = "unauth"; break;
                case 403: this._authStatus = "forbidden"; break;
                default: this._authStatus = "error"; break;
            }

            // 【关键】将错误状态抛出，这样外层才能在 catch 中拿到这个 status
            throw { status };
        }
    }

    render() {
        let content;
        switch (this._authStatus) {
            case "ok": content = this.renderContent(); break;
            case "unauth": content = this.renderUnauthorized(); break;
            case "forbidden": content = this.renderForbidden(); break;
            case "error": content = this.renderError(); break;
            case "loading": content = this.renderLoading(); break;
        }
        return html`
    ${content}
  `;
    }
}