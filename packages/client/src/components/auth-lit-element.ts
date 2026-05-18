import { state } from "lit/decorators.js";
import { DaisyUIElement } from "./daisy-ui-element";
import { html } from "lit";
import axiosi from "../utils/axios";

import '../views/error-element'
import '../views/loading-element'
import '../views/unauthorized-element'

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

type AuthStatus = 'loading' | 'ok' | `unauth` | 'error';

export abstract class AuthLitElement extends DaisyUIElement {

    @state() private _authStatus: AuthStatus = 'loading';

    // 子类可以覆盖这个方法来指定验证的 API 端点
    protected get verifyEndpoint(): string {
        return '/verify';
    }

    // 未认证或者认证失败
    protected renderUnauthorized() {
        return html`<unauthorized-element></unauthorized-element>`
    }

    protected renderError() {
        return html`<error-element></error-element>`
    }

    protected renderLoading() {
        return html`<loading-element></loading-element>`
    }

    protected abstract renderContent(): unknown;

    connectedCallback(): void {
        super.connectedCallback()
        this._verifyToken()
    }

    private async _verifyToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            this._authStatus = 'unauth';
            return;
        }
        try {
            await axiosi.get(this.verifyEndpoint).then(res => {
                console.log("res.status: ", res.status)
                switch (res.status) {
                    case 200: this._authStatus = "ok"; break
                    default: this._authStatus = "error"; break
                }
            }).catch((e) => {
                switch (e.response.status) {
                    case 401: this._authStatus = "unauth"; break
                    case 403: this._authStatus = "unauth"; break
                    case 500: this._authStatus = "error"; break
                }
            })
        } catch {
            this._authStatus = "error"
        }
    }

    render() {
        switch (this._authStatus) {
            case "ok": return this.renderContent()
            case "unauth": return this.renderUnauthorized()
            case "error": return this.renderError()
            case "loading": return this.renderLoading()
        }
    }
}