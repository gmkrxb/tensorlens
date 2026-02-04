/**
 * SVG图标集合 - 统一管理所有图标
 * 避免使用emoji，使用SVG确保跨平台一致性
 */
const Icons = {
    // 文件夹图标
    folderClosed: `<svg viewBox="0 0 24 24" class="icon"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
    folderOpen: `<svg viewBox="0 0 24 24" class="icon"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`,

    // 通用文件图标
    file: `<svg viewBox="0 0 24 24" class="icon"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,

    // 代码文件 (js, ts, py等)
    code: `<svg viewBox="0 0 24 24" class="icon"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,

    // Python文件
    python: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,

    // JSON/配置文件
    config: `<svg viewBox="0 0 24 24" class="icon"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,

    // 文本文件
    text: `<svg viewBox="0 0 24 24" class="icon"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,

    // Markdown文件
    markdown: `<svg viewBox="0 0 24 24" class="icon"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 10H9v-4l-2 2.5L5 10v4H3V8h2l2 2.5L9 8h2v6zm5 0l-3-4h2V8h2v2h2l-3 4z"/></svg>`,

    // HTML文件
    html: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 17.56l4.07-1.13.55-6.18H9.38l-.18-2.01h7.6l.2-1.99H6.99l.55 6.18h6.39l-.26 2.89L12 20l-3.68-.95-.25-2.8H6.04l.5 5.5L12 23.5l5.45-1.75.75-8.25H9.62l-.18-2.01h8.75l.55-6.18H5.28l.18 2.01h7.92l.18 2.01H5.65l.18 2.01h8.35l-.26 2.89L12 17.56z"/></svg>`,

    // CSS文件
    css: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/></svg>`,

    // 图片文件
    image: `<svg viewBox="0 0 24 24" class="icon"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,

    // PDF文件
    pdf: `<svg viewBox="0 0 24 24" class="icon"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>`,

    // 压缩包文件
    archive: `<svg viewBox="0 0 24 24" class="icon"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2v2z"/></svg>`,

    // 张量/数据文件
    tensor: `<svg viewBox="0 0 24 24" class="icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H8v-2h2V9h2v2h2v2h-2v4zm3-8V7h2v2h-2zm-8 0V7h2v2H7z"/></svg>`,

    // 状态图标
    success: `<svg viewBox="0 0 24 24" class="icon icon-success"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    error: `<svg viewBox="0 0 24 24" class="icon icon-error"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" class="icon icon-warning"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    info: `<svg viewBox="0 0 24 24" class="icon icon-info"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,

    // 操作图标
    refresh: `<svg viewBox="0 0 24 24" class="icon"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    search: `<svg viewBox="0 0 24 24" class="icon"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
    download: `<svg viewBox="0 0 24 24" class="icon"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
    export: `<svg viewBox="0 0 24 24" class="icon"><path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" class="icon"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" class="icon"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
};

// 根据文件扩展名获取图标
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        // 代码文件
        'js': Icons.code,
        'ts': Icons.code,
        'jsx': Icons.code,
        'tsx': Icons.code,
        'vue': Icons.code,

        // Python
        'py': Icons.python,
        'pyw': Icons.python,
        'pyx': Icons.python,

        // 配置文件
        'json': Icons.config,
        'xml': Icons.config,
        'yaml': Icons.config,
        'yml': Icons.config,
        'toml': Icons.config,
        'ini': Icons.config,

        // 文本
        'txt': Icons.text,
        'log': Icons.text,

        // Markdown
        'md': Icons.markdown,
        'markdown': Icons.markdown,

        // Web
        'html': Icons.html,
        'htm': Icons.html,
        'css': Icons.css,
        'scss': Icons.css,
        'less': Icons.css,

        // 图片
        'png': Icons.image,
        'jpg': Icons.image,
        'jpeg': Icons.image,
        'gif': Icons.image,
        'svg': Icons.image,
        'webp': Icons.image,
        'ico': Icons.image,
        'bmp': Icons.image,

        // PDF
        'pdf': Icons.pdf,

        // 压缩包
        'zip': Icons.archive,
        'rar': Icons.archive,
        '7z': Icons.archive,
        'tar': Icons.archive,
        'gz': Icons.archive,

        // 张量/数据文件
        'npz': Icons.tensor,
        'npy': Icons.tensor,
        'pt': Icons.tensor,
        'pth': Icons.tensor,
        'h5': Icons.tensor,
        'hdf5': Icons.tensor,
    };

    return iconMap[ext] || Icons.file;
}

// 获取文件夹图标
function getFolderIcon(isExpanded) {
    return isExpanded ? Icons.folderOpen : Icons.folderClosed;
}

// 导出（供其他脚本使用）
if (typeof window !== 'undefined') {
    window.Icons = Icons;
    window.getFileIcon = getFileIcon;
    window.getFolderIcon = getFolderIcon;
}
