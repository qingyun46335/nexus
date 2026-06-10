/**
 * 将字节（Bytes）转换为可读的文件大小字符串
 * @param bytes 字节数
 * @param decimals 保留的小数位数，默认为 2
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    // 计算单位的指数索引
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // 这里的逻辑：数值 / 1024的i次方，并保留小数
    const result = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${result} ${sizes[i]}`;
}