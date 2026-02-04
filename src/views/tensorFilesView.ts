/**
 * 张量文件视图提供器
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TensorFilesViewProvider implements vscode.TreeDataProvider<FileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private workspaceRoot: string | undefined) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        if (element) {
            return [];
        }

        // 查找工作区中的张量文件
        const tensorFiles = await this.findTensorFiles(this.workspaceRoot);
        return tensorFiles.map(file => new FileItem(
            path.basename(file),
            file,
            this.getFileIcon(file),
            vscode.TreeItemCollapsibleState.None,
            {
                command: 'tensorLens.openFile',
                title: '打开文件',
                arguments: [vscode.Uri.file(file)]
            }
        ));
    }

    private async findTensorFiles(dir: string): Promise<string[]> {
        const files: string[] = [];
        const extensions = ['.npz', '.npy', '.pt', '.pth'];

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
            case '.npz':
            case '.npy':
                return '📊';
            case '.pt':
            case '.pth':
                return '🔥';
            default:
                return '📄';
        }
    }
}

class FileItem extends vscode.TreeItem {
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
        this.iconPath = new vscode.ThemeIcon('file');
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
