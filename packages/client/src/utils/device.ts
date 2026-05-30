/**
 * 移动端检测工具
 * -------------------------------------
 * 用于判断当前环境是否为移动设备。
 */

export function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
}

/**
 * 监听窗口变化并实时更新移动端状态。
 * 可结合防抖函数一起使用。
 */
export function watchMobileState(
  callback: (mobile: boolean) => void,
  delay = 300
) {
  const update = () => callback(detectMobile());
  update(); // 初始化时立即执行

  const debouncedUpdate = (() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, delay);
    };
  })();

  window.addEventListener('resize', debouncedUpdate);
}
