export interface UrlParamResult {
    exists: boolean;
    value: string | null;
}

/**
 * 获取地址栏指定参数的值及是否存在
 * @param name 参数名称
 * @returns 包含 exists (是否存在) 和 value (参数值) 的对象
 */
export function getUrlParam(name: string): UrlParamResult {
    // 在 Node.js 服务端渲染(SSR)环境下防止报错
    if (typeof window === 'undefined') {
        return { exists: false, value: null };
    }

    const searchParams = new URLSearchParams(window.location.search);

    return {
        exists: searchParams.has(name),
        value: searchParams.get(name)
    };
}