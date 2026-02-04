/**
 * 压缩包查看器前端脚本
 */
(function () {
    const vscode = acquireVsCodeApi();

    // 状态管理
    let state = {
        entries: [],
        selectedEntry: null,
        expandedPaths: new Set()
    };

    // DOM元素
    const elements = {
        fileTree: document.getElementById('fileTree'),
        previewHeader: document.getElementById('previewHeader'),
        previewContent: document.getElementById('previewContent'),
        searchInput: document.getElementById('searchInput'),
        fileCount: document.getElementById('fileCount'),
        statusText: document.getElementById('statusText'),
        archiveStats: document.getElementById('archiveStats'),
        loadingOverlay: document.getElementById('loadingOverlay')
    };

    // 初始化
    function init() {
        bindEvents();
        showLoading(true);
    }

    // 绑定事件
    function bindEvents() {
        // 搜索
        document.getElementById('searchBtn').addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        elements.searchInput.addEventListener('input', handleLocalSearch);

        // 刷新
        document.getElementById('refreshBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'refresh' });
        });

        // 全部解压
        document.getElementById('extractAllBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'extractAll' });
        });
    }

    // 处理来自插件的消息
    window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.type) {
            case 'archiveEntries':
                handleArchiveEntries(message.data);
                break;
            case 'filePreview':
                handleFilePreview(message);
                break;
            case 'searchResults':
                handleSearchResults(message.data);
                break;
            case 'error':
                showError(message.message);
                break;
        }
    });

    // 处理压缩包内容列表
    function handleArchiveEntries(entries) {
        showLoading(false);
        state.entries = entries;

        const fileCount = entries.filter(e => !e.isDirectory).length;
        const dirCount = entries.filter(e => e.isDirectory).length;
        const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);

        elements.fileCount.textContent = `${fileCount} 文件, ${dirCount} 目录`;
        elements.archiveStats.textContent = `总大小: ${formatSize(totalSize)}`;
        updateStatus('就绪');

        renderFileTree(entries);
    }

    // 渲染文件树
    function renderFileTree(entries) {
        const tree = buildTree(entries);
        elements.fileTree.innerHTML = renderTreeNode(tree, 0);
        bindTreeEvents();
    }

    // 构建树结构
    function buildTree(entries) {
        const root = { name: '', children: {}, isDirectory: true };

        entries.forEach(entry => {
            const parts = entry.path.split('/').filter(p => p);
            let current = root;

            parts.forEach((part, index) => {
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        path: parts.slice(0, index + 1).join('/'),
                        children: {},
                        isDirectory: index < parts.length - 1 || entry.isDirectory,
                        size: entry.size,
                        entry: entry
                    };
                }
                current = current.children[part];
            });
        });

        return root;
    }

    // 渲染树节点
    function renderTreeNode(node, level) {
        const children = Object.values(node.children);

        // 排序：目录优先，然后按名称
        children.sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return children.map(child => {
            const isExpanded = state.expandedPaths.has(child.path);
            const icon = child.isDirectory
                ? (typeof window.getFolderIcon === 'function' ? window.getFolderIcon(isExpanded) : Icons.folderClosed)
                : getFileIcon(child.name);

            let html = `
                <div class="tree-item ${state.selectedEntry === child.path ? 'selected' : ''}" 
                     data-path="${child.path}" 
                     data-is-dir="${child.isDirectory}"
                     style="padding-left: ${level * 16 + 8}px">
                    <span class="tree-icon">${icon}</span>
                    <span class="tree-name">${child.name}</span>
                    ${!child.isDirectory ? `<span class="tree-size">${formatSize(child.size || 0)}</span>` : ''}
                </div>
            `;

            if (child.isDirectory && isExpanded) {
                html += `<div class="tree-children">${renderTreeNode(child, level + 1)}</div>`;
            }

            return html;
        }).join('');
    }

    // 获取文件图标 (使用SVG)
    function getFileIcon(name) {
        if (typeof window.getFileIcon === 'function') {
            return window.getFileIcon(name);
        }
        // 降级处理：如果icons.js未加载
        return Icons.file;
    }

    // 绑定树事件
    function bindTreeEvents() {
        elements.fileTree.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                const isDir = item.dataset.isDir === 'true';

                if (isDir) {
                    toggleFolder(path);
                } else {
                    selectFile(path);
                }
            });

            // 右键菜单
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, item.dataset.path, item.dataset.isDir === 'true');
            });
        });
    }

    // 切换文件夹展开/折叠
    function toggleFolder(path) {
        if (state.expandedPaths.has(path)) {
            state.expandedPaths.delete(path);
        } else {
            state.expandedPaths.add(path);
        }
        renderFileTree(state.entries);
    }

    // 选择文件
    function selectFile(path) {
        state.selectedEntry = path;

        // 更新选中状态
        elements.fileTree.querySelectorAll('.tree-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.path === path);
        });

        // 请求预览
        showLoading(true);
        elements.previewHeader.innerHTML = `<span>${path}</span>`;
        vscode.postMessage({
            command: 'previewFile',
            entryPath: path
        });
    }

    // 处理文件预览
    function handleFilePreview(data) {
        showLoading(false);

        let content = '';

        switch (data.content.type) {
            case 'text':
                content = `<pre class="code-preview"><code class="language-${data.content.language || 'text'}">${escapeHtml(data.content.content)}</code></pre>`;
                break;
            case 'image':
                content = `<div class="image-preview"><img src="${data.content.content}" alt="${data.path}"></div>`;
                break;
            case 'binary':
                content = `
                    <div class="binary-preview">
                        <div class="binary-info">二进制文件 (${formatSize(data.content.size || 0)})</div>
                        <pre class="hex-dump">${data.content.content}</pre>
                    </div>
                `;
                break;
        }

        elements.previewContent.innerHTML = content;
    }

    // 显示右键菜单
    function showContextMenu(e, path, isDir) {
        // 简单实现：直接提供解压选项
        const action = confirm(`${isDir ? '解压此目录' : '解压此文件'}？`);
        if (action) {
            vscode.postMessage({
                command: 'extractFile',
                entryPath: path
            });
        }
    }

    // 搜索处理
    function handleSearch() {
        const query = elements.searchInput.value.trim();
        if (!query) return;

        vscode.postMessage({
            command: 'search',
            query: query
        });
    }

    // 本地搜索（即时筛选）
    function handleLocalSearch() {
        const query = elements.searchInput.value.toLowerCase();

        elements.fileTree.querySelectorAll('.tree-item').forEach(item => {
            const name = item.querySelector('.tree-name').textContent.toLowerCase();
            const path = item.dataset.path.toLowerCase();
            const match = name.includes(query) || path.includes(query);
            item.style.display = match ? '' : 'none';
        });
    }

    // 处理搜索结果
    function handleSearchResults(entries) {
        updateStatus(`找到 ${entries.length} 个匹配`);
        renderFileTree(entries);
    }

    // 工具函数
    function formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${units[i]}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        showLoading(false);
        updateStatus(`错误: ${message}`);
        elements.previewContent.innerHTML = `<div class="error-state">${message}</div>`;
    }

    function updateStatus(text) {
        elements.statusText.textContent = text;
    }

    // 启动
    init();
})();
