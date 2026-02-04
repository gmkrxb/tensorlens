/**
 * 工具函数模块
 */

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
}

/**
 * 判断是否为张量文件
 */
export function isTensorFile(filePath: string): boolean {
    const ext = getFileExtension(filePath);
    return ['.npz', '.npy', '.pt', '.pth'].includes(ext);
}

/**
 * 判断是否为压缩文件
 */
export function isArchiveFile(filePath: string): boolean {
    const ext = getFileExtension(filePath);
    return ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz'].includes(ext);
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: unknown, ...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            (func as (...args: unknown[]) => unknown).apply(this, args);
        }, wait);
    };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: unknown, ...args: Parameters<T>) {
        if (!inThrottle) {
            (func as (...args: unknown[]) => unknown).apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * 生成随机ID
 */
export function generateId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * 安全解析JSON
 */
export function safeParseJson<T>(json: string, defaultValue: T): T {
    try {
        return JSON.parse(json);
    } catch {
        return defaultValue;
    }
}
