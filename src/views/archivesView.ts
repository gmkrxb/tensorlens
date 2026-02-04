/**
 * 压缩文件视图提供器
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ArchivesViewProvider implements vscode.TreeDataProvider<ArchiveItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ArchiveItem | undefined | null | void> = new vscode.EventEmitter<ArchiveItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ArchiveItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ArchiveItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ArchiveItem): Promise<ArchiveItem[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        if (element) {
            return [];
        }

        // 查找工作区中的压缩文件
        const archiveFiles = await this.findArchiveFiles(this.workspaceRoot);
        return archiveFiles.map(file => new ArchiveItem(
            path.basename(file),
            file,
            this.getFileIcon(file),
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'tensorLens.previewArchive',
                title: '预览压缩文件',
                arguments: [vscode.Uri.file(file)]
            }
        ));
    }

    private async findArchiveFiles(dir: string): Promise<string[]> {
        const files: string[] = [];
        const extensions = ['.zip', '.rar', '.7z', '.tar', '.gz'];

        const scan = async (directory: string) => {
            try {
                const entries = await fs.promises.readdir(directory, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(directory, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        await scan(fullPath);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch (err) {
                // 忽略无权限访问的目录
            }
        };

        await scan(dir);
        return files.slice(0, 50); // 限制显示数量
    }

    private getFileIcon(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.zip':
                return '📦';
            case '.rar':
            case '.7z':
                return '🗜️';
            case '.tar':
            case '.gz':
                return '📚';
            default:
                return '📄';
        }
    }
}

class ArchiveItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly icon: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = filePath;
        this.description = this.getFileSize(filePath);
        this.iconPath = new vscode.ThemeIcon('file-zip');
    }

    private getFileSize(filePath: string): string {
        try {
            const stats = fs.statSync(filePath);
            const size = stats.size;
            if (size < 1024) return `${size}B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
            if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`;
            return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
        } catch {
            return '';
        }
    }
}
