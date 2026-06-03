export function truncateString(str: string, num: number, showDots: boolean = true): string {
    if (str.length <= num) {
        return str;
    }

    const truncated = str.slice(0, num);

    return showDots ? `${truncated}...` : truncated;
}