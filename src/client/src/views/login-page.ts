import { html, css, } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
// 继承你提供的 DaisyUIElement
import { DaisyUIElement } from '../components/daisy-ui-element';
import axiosi from '../utils/axios';
import type { AxiosResponse } from 'axios';

// 登录表单数据类型
interface LoginFormData {
  username: string;
  password: string;
}

type TokenData = {
  token: string
}

@customElement('login-page')
export class LoginPage extends DaisyUIElement {
  // 登录状态
  @state()
  private isLoading = false;

  // 提示信息状态
  @state()
  private toastMessage = '';
  @state()
  private toastType: 'success' | 'error' = 'success';

  // 表单DOM引用
  @query('#loginForm')
  private loginForm!: HTMLFormElement;

  /**
   * 模拟登录请求
   */
  private async handleLogin(formData: LoginFormData): Promise<AxiosResponse<TokenData>> {
    // 这里替换成你的真实登录接口
    const form = new FormData()
    form.append("username", formData.username)
    form.append("password", formData.password)

    // 模拟规则：用户名=test_user 且 密码=123456 登录成功
    return await axiosi.post("/admin/login", form)
  }

  /**
   * 表单提交处理
   */
  private async onSubmit(e: SubmitEvent) {
    console.log("表单提交处理")
    e.preventDefault();
    this.isLoading = true;

    const formData = new FormData(this.loginForm);
    const data: LoginFormData = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    };

    try {
      await this.handleLogin(data).then(res => {
        if (res.status === 200) {
          this.showToast('登录成功！欢迎回来', 'success');
          window.localStorage.setItem("token", res.data.token)
          location.href = "/pages/admin"
        } else {
          this.showToast('用户名或密码错误', 'error');
        }
      });
      // 登录成功后可在这里执行跳转/派发事件等逻辑
      // this.dispatchEvent(new CustomEvent('login-success', { detail: data }));
    } catch (err) {
      this.showToast('登录失败，请稍后重试', 'error');
      console.error('登录异常：', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 显示提示信息
   */
  private showToast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;

    // 3秒后自动隐藏提示
    setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  }

  // 组件样式
  static defaultStyles = css`
    .login-card {
      @apply w-full max-w-md shadow-xl rounded-box;
    }
    .form-control {
      @apply mb-4;
    }
    .btn {
      @apply w-full;
    }
  `;

  render() {
    return html`
      <!-- 页面容器 -->
      <div class="min-h-screen flex items-center justify-center p-4 bg-base-200">
        <!-- 登录卡片 -->
        <div class="login-card card bg-base-100">
          <div class="card-body">
            <h2 class="card-title text-2xl justify-center mb-6">用户登录</h2>

            <!-- 登录表单 -->
            <form id="loginForm" @submit=${this.onSubmit} novalidate>
              <!-- 用户名 -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text">用户名</span>
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="请输入用户名"
                  class="input input-bordered w-full"
                  required
                  ?disabled=${this.isLoading}
                />
              </div>

              <!-- 密码 -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text">密码</span>
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="请输入密码"
                  class="input input-bordered w-full"
                  required
                  ?disabled=${this.isLoading}
                />
              </div>

              <!-- 登录按钮 -->
              <div class="mt-6">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  ?disabled=${this.isLoading}
                >
                  ${this.isLoading ? html`<span class="loading loading-spinner"></span> 登录中...` : '登录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- DaisyUI 提示信息 -->
      ${this.toastMessage && html`
        <div class="toast toast-top toast-center">
          <div class="alert ${this.toastType === 'success' ? 'alert-success' : 'alert-error'}">
            <span>${this.toastMessage}</span>
          </div>
        </div>
      `}
    `;
  }
}

// 类型声明（防止TS报错）
declare global {
  interface HTMLElementTagNameMap {
    'login-page': LoginPage;
  }
}