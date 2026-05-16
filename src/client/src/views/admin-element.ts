import { html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { AuthLitElement } from "../components/auth-lit-element";

@customElement("admin-element")
export class AdminElement extends AuthLitElement {

    @state() private _user = { name: "Admin", email: "admin@example.com" };

    static defaultStyles = css`
        :host {
            display: block;
            min-height: 100vh;
            background-color: oklch(var(--b2));
            font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
        }

        /* ── Topbar ── */
        .topbar {
            position: sticky;
            top: 0;
            z-index: 10;
            height: 56px;
            background-color: oklch(var(--b1));
            border-bottom: 1px solid oklch(var(--b3));
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.5rem;
        }

        .brand {
            font-size: 0.9rem;
            font-weight: 600;
            color: oklch(var(--bc));
            letter-spacing: -0.01em;
        }

        .brand span {
            color: oklch(var(--p));
        }

        .topbar-right {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: oklch(var(--p) / 0.15);
            color: oklch(var(--p));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .user-name {
            font-size: 0.85rem;
            color: oklch(var(--bc) / 0.7);
        }

        /* ── Main ── */
        .main {
            max-width: 960px;
            margin: 0 auto;
            padding: 2rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .page-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: oklch(var(--bc));
            margin: 0;
        }

        .page-subtitle {
            font-size: 0.875rem;
            color: oklch(var(--bc) / 0.45);
            margin: 0.25rem 0 0;
        }

        /* ── Stats ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1rem;
        }

        .stat-card {
            background-color: oklch(var(--b1));
            border: 1px solid oklch(var(--b3));
            border-radius: 12px;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .stat-label {
            font-size: 0.75rem;
            font-weight: 500;
            color: oklch(var(--bc) / 0.45);
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .stat-value {
            font-size: 1.75rem;
            font-weight: 700;
            color: oklch(var(--bc));
            line-height: 1;
        }

        .stat-diff {
            font-size: 0.75rem;
            color: oklch(var(--su));
        }

        /* ── Section ── */
        .section {
            background-color: oklch(var(--b1));
            border: 1px solid oklch(var(--b3));
            border-radius: 12px;
            overflow: hidden;
        }

        .section-head {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid oklch(var(--b3));
            font-size: 0.875rem;
            font-weight: 600;
            color: oklch(var(--bc));
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }

        .table th {
            padding: 0.625rem 1.25rem;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 500;
            color: oklch(var(--bc) / 0.4);
            letter-spacing: 0.04em;
            text-transform: uppercase;
            background-color: oklch(var(--b2) / 0.5);
        }

        .table td {
            padding: 0.75rem 1.25rem;
            color: oklch(var(--bc) / 0.75);
            border-top: 1px solid oklch(var(--b3));
        }

        .table tr:hover td {
            background-color: oklch(var(--b2) / 0.5);
        }

        .badge {
            display: inline-block;
            padding: 0.2rem 0.6rem;
            border-radius: 99px;
            font-size: 0.7rem;
            font-weight: 600;
        }

        .badge-success {
            background-color: oklch(var(--su) / 0.12);
            color: oklch(var(--su));
        }

        .badge-warning {
            background-color: oklch(var(--wa) / 0.12);
            color: oklch(var(--wa));
        }

        .badge-neutral {
            background-color: oklch(var(--bc) / 0.07);
            color: oklch(var(--bc) / 0.5);
        }
    `;

    protected renderContent() {
        const initials = this._user.name.slice(0, 2).toUpperCase();

        return html`
            <div class="topbar">
                <span class="brand">后台管理<span> · Admin</span></span>
                <div class="topbar-right">
                    <span class="user-name">${this._user.email}</span>
                    <div class="avatar">${initials}</div>
                </div>
            </div>

            <div class="main">
                <div>
                    <h1 class="page-title">欢迎回来，${this._user.name}</h1>
                    <p class="page-subtitle">这是一个演示用的管理页面</p>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-label">总用户</span>
                        <span class="stat-value">1,284</span>
                        <span class="stat-diff">↑ 本月 +32</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">活跃会话</span>
                        <span class="stat-value">47</span>
                        <span class="stat-diff">↑ 较昨日 +5</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">今日请求</span>
                        <span class="stat-value">8.3k</span>
                        <span class="stat-diff">↑ 较昨日 +12%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">错误率</span>
                        <span class="stat-value">0.2%</span>
                        <span class="stat-diff" style="color: oklch(var(--su))">↓ 较昨日 -0.1%</span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-head">最近用户</div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>状态</th>
                                <th>注册时间</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Alice</td>
                                <td>alice@example.com</td>
                                <td><span class="badge badge-success">活跃</span></td>
                                <td>2025-05-10</td>
                            </tr>
                            <tr>
                                <td>Bob</td>
                                <td>bob@example.com</td>
                                <td><span class="badge badge-warning">待验证</span></td>
                                <td>2025-05-12</td>
                            </tr>
                            <tr>
                                <td>Carol</td>
                                <td>carol@example.com</td>
                                <td><span class="badge badge-neutral">禁用</span></td>
                                <td>2025-05-14</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}
