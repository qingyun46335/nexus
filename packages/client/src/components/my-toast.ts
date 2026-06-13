import { html, css } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { DaisyUIElement } from "./daisy-ui-element";

@customElement("my-toast")
export class MyToast extends DaisyUIElement {
  static defaultStyles = css`
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-height: calc(100vh - 40px);
      overflow: hidden;
    }

    .alert {
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .alert svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }
  `;

  /** 最大显示数量，超出后自动移除最早的消息 */
  @property({ type: Number, attribute: "max-count" })
  maxCount = 3;

  /** 是否启用队列模式：true=超出后入队等待，false=超出后直接丢弃最早的 */
  @property({ type: Boolean, attribute: "queue-mode" })
  queueMode = false;

  @state()
  messages: {
    id: number;
    text: string;
    type: "success" | "error" | "warning" | "info";
  }[] = [];

  // 等待队列
  private messageQueue: {
    text: string;
    type: "success" | "error" | "warning" | "info";
    duration: number;
  }[] = [];

  /** 公共方法：显示 toast */
  show(
    text: string,
    type: "success" | "error" | "warning" | "info" = "success",
    duration = 3000
  ) {
    // 如果超出最大数量
    if (this.messages.length >= this.maxCount) {
      if (this.queueMode) {
        // 队列模式：加入等待队列
        this.messageQueue.push({ text, type, duration });
        return;
      } else {
        // 直接移除最早的消息
        this.removeOldest();
      }
    } else if (this.maxCount <= 0) {
      // maxCount <= 0 时不显示任何消息
      return;
    }

    this.addMessage(text, type, duration);
  }

  /** 添加消息 */
  private addMessage(
    text: string,
    type: "success" | "error" | "warning" | "info",
    duration: number
  ) {
    const id = Date.now() + Math.random(); // 避免同一毫秒内的 ID 冲突

    this.messages = [...this.messages, { id, text, type }];

    setTimeout(() => {
      this.removeMessage(id);
      // 检查队列中是否有待显示的消息
      this.processQueue();
    }, duration);
  }

  /** 移除指定消息 */
  private removeMessage(id: number) {
    this.messages = this.messages.filter((m) => m.id !== id);
  }

  /** 移除最早的消息 */
  private removeOldest() {
    if (this.messages.length > 0) {
      this.messages = this.messages.slice(1);
    }
  }

  /** 处理队列中的消息 */
  private processQueue() {
    if (this.queueMode && this.messageQueue.length > 0 && this.messages.length < this.maxCount) {
      const next = this.messageQueue.shift();
      if (next) {
        this.addMessage(next.text, next.type, next.duration);
      }
    }
  }

  /** 清空所有消息（包括队列） */
  clear() {
    this.messages = [];
    this.messageQueue = [];
  }

  // DaisyUI alert icons
  icon(type: string) {
    switch (type) {
      case "success":
        return html`<svg xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
          class="stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
      case "error":
        return html`<svg xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
          class="stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
      case "warning":
        return html`<svg xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
          class="stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M12 5.5L4.44 19h15.12L12 5.5z" />
        </svg>`;
      case "info":
        return html`<svg xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
          class="stroke-current">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>`;
    }
  }

  render() {
    return html`
      ${this.messages.map((m) => {
      const status = {
        "alert-success": m.type === "success",
        "alert-error": m.type === "error",
        "alert-warning": m.type === "warning",
        "alert-info": m.type === "info"
      };
      return html`
          <div role="alert" class="alert ${classMap(status)}">
            ${this.icon(m.type)}
            <span>${m.text}</span>
          </div>
        `;
    })}
    `;
  }
}