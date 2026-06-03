import { html, css } from 'lit';
import { DaisyUIElement } from './daisy-ui-element'; // 你的基类
import { customElement, property } from 'lit/decorators.js';

@customElement("rainbow-button")
export class RainbowButton extends DaisyUIElement {

  @property({ type: Boolean })
  disabled: boolean;

  @property({ type: String })
  size: 'xs' | 'sm' | 'md' | 'lg';

  @property({ type: Boolean })
  outline: boolean;

  @property({ type: Boolean })
  animated: boolean;

  @property({ type: Boolean })
  selected: boolean;

  static defaultStyles = css`
    :host {
      display: inline-block;
    }

    .btn-rainbow {
      /* 彩虹渐变背景 */
      background: linear-gradient(
        90deg,
        #ff0000 0%,
        #ff8000 14%,
        #ffff00 28%,
        #00ff00 42%,
        #00ffff 56%,
        #0080ff 70%,
        #8000ff 84%,
        #ff0080 100%
      );
      background-size: 200% 100%;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      border: none;
      position: relative;
      overflow: hidden;
    }

    /* 动画效果 */
    .btn-rainbow.animated {
      animation: rainbow-shift 3s linear infinite;
    }

    @keyframes rainbow-shift {
      0% {
        background-position: 0% 50%;
      }
      100% {
        background-position: 200% 50%;
      }
    }

    /* Hover 效果 - 增加亮度 */
    .btn-rainbow:hover:not(:disabled) {
      filter: brightness(1.1);
      box-shadow: 0 0 20px rgba(255, 100, 100, 0.4),
                  0 0 30px rgba(100, 255, 100, 0.3),
                  0 0 40px rgba(100, 100, 255, 0.2);
    }

    /* Active 效果 */
    .btn-rainbow:active:not(:disabled) {
      filter: brightness(0.95);
      transform: scale(0.98);
    }

    /* Focus 效果 */
    .btn-rainbow:focus-visible {
      outline: 2px solid hsl(var(--bc) / 0.2);
      outline-offset: 2px;
    }

    /* Outline 变体 */
    .btn-rainbow.btn-outline {
      background: transparent;
      border: 2px solid transparent;
      border-image: linear-gradient(
        90deg,
        #ff0000,
        #ff8000,
        #ffff00,
        #00ff00,
        #00ffff,
        #0080ff,
        #8000ff,
        #ff0080
      ) 1;
      color: inherit;
      text-shadow: none;
    }

    .btn-rainbow.btn-outline:hover:not(:disabled) {
      background: linear-gradient(
        90deg,
        #ff0000 0%,
        #ff8000 14%,
        #ffff00 28%,
        #00ff00 42%,
        #00ffff 56%,
        #0080ff 70%,
        #8000ff 84%,
        #ff0080 100%
      );
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    /* Disabled 状态 */
    .btn-rainbow:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  constructor() {
    super();
    this.disabled = false;
    this.size = 'md';
    this.outline = false;
    this.animated = false;
    this.selected = false;
  }

  render() {
    const sizeClass = this.size !== 'md' ? `btn-${this.size}` : '';
    const outlineClass = this.outline ? 'btn-outline' : '';
    const animatedClass = this.animated ? 'animated' : '';
    const rainbowClass = this.selected ? 'btn-rainbow' : '';

    return html`
      <button
        class="btn ${rainbowClass} ${sizeClass} ${outlineClass} ${animatedClass}"
        ?disabled=${this.disabled}
      >
        <slot></slot>
      </button>
    `;
  }
}