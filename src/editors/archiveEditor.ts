/**
 * 压缩文件自定义编辑器
 */
import * as vscode from 'vscode';
import { ArchiveService } from '../services/archiveService';
import { WebviewManager } from '../webview/webviewManager';

export class ArchiveEditorProvider implements vscode.CustomReadonlyEditorProvider<ArchiveDocument> {
    public static readonly viewType = 'tensorLens.archiveEditor';

    private archiveService: ArchiveService;
    private webviewManager: WebviewManager;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.archiveService = new ArchiveService();
        this.webviewManager = new WebviewManager(context);
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new ArchiveEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            ArchiveEditorProvider.viewType,
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                },
                supportsMultipleEditorsPerDocument: false
            }
        );
    }

    async openCustomDocument(
        uri: vscode.Uri
    ): Promise<ArchiveDocument> {
        return new ArchiveDocument(uri);
    }

    async resolveCustomEditor(
        document: ArchiveDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ]
        };

        // 设置webview内容
        webviewPanel.webview.html = this.webviewManager.getArchiveViewerHtml(
            webviewPanel.webview,
            document.uri.fsPath
        );

        // 加载压缩包内容列表
        this.loadArchiveEntries(document.uri, webviewPanel.webview);

        // 处理webview消息
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleMessage(message, document.uri, webviewPanel.webview);
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async loadArchiveEntries(uri: vscode.Uri, webview: vscode.Webview) {
        try {
            const entries = await this.archiveService.listEntries(uri.fsPath);
            webview.postMessage({
                type: 'archiveEntries',
                data: entries
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `加载失败: ${error}`
            });
        }
    }

    private async handleMessage(
        message: { command: string; [key: string]: unknown },
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        switch (message.command) {
            case 'extractAll':
                await this.handleExtractAll(uri);
                break;
            case 'extractFile':
                await this.handleExtractFile(uri, message.entryPath as string);
                break;
            case 'previewFile':
                await this.handlePreviewFile(uri, message.entryPath as string, webview);
                break;
            case 'search':
                await this.handleSearch(message.query as string, uri, webview);
                break;
            case 'refresh':
                await this.loadArchiveEntries(uri, webview);
                break;
        }
    }

    private async handleExtractAll(uri: vscode.Uri) {
        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择解压目标目录'
        });

        if (!targetFolder || targetFolder.length === 0) {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '正在解压...',
                cancellable: false
            }, async () => {
                await this.archiveService.extract(uri.fsPath, targetFolder[0].fsPath);
            });

            vscode.window.showInformationMessage('解压完成！');
        } catch (error) {
            vscode.window.showErrorMessage(`解压失败: ${error}`);
        }
    }

    private async handleExtractFile(uri: vscode.Uri, entryPath: string) {
        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择解压目标目录'
        });

        if (!targetFolder || targetFolder.length === 0) {
            return;
        }

        try {
            await this.archiveService.extractSingle(
                uri.fsPath,
                entryPath,
                targetFolder[0].fsPath
            );
            vscode.window.showInformationMessage('解压完成！');
        } catch (error) {
            vscode.window.showErrorMessage(`解压失败: ${error}`);
        }
    }

    private async handlePreviewFile(uri: vscode.Uri, entryPath: string, webview: vscode.Webview) {
        try {
            const fileExt = require('path').extname(entryPath).toLowerCase();
            
            // 如果是张量文件，调用命令打开预览
            if (['.npy', '.npz', '.pt', '.pth'].includes(fileExt)) {
                await vscode.commands.executeCommand(
                    'tensorLens.previewArchive',
                    uri,
                    entryPath
                );
                return;
            }
            
            // 其他文件类型的预览
            const content = await this.archiveService.readFileContent(uri.fsPath, entryPath);
            webview.postMessage({
                type: 'filePreview',
                path: entryPath,
                content: content
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `预览失败: ${error}`
            });
        }
    }

    private async handleSearch(query: string, uri: vscode.Uri, webview: vscode.Webview) {
        try {
            const entries = await this.archiveService.listEntries(uri.fsPath);
            const filtered = entries.filter(e =>
                e.name.toLowerCase().includes(query.toLowerCase())
            );
            webview.postMessage({
                type: 'searchResults',
                data: filtered
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `搜索失败: ${error}`
            });
        }
    }
}

/**
 * 压缩文件文档类
 */
class ArchiveDocument implements vscode.CustomDocument {
    constructor(public readonly uri: vscode.Uri) { }

    dispose(): void {
        // 清理资源
    }
}
