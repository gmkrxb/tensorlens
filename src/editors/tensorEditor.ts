/**
 * 张量文件自定义编辑器
 */
import * as vscode from 'vscode';
import { TensorService } from '../services/tensorService';
import { WebviewManager } from '../webview/webviewManager';
import { DependencyChecker } from '../services/dependencyChecker';

export class TensorEditorProvider implements vscode.CustomReadonlyEditorProvider<TensorDocument> {
    public static readonly viewType = 'tensorLens.tensorEditor';

    private tensorService: TensorService;
    private webviewManager: WebviewManager;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.tensorService = new TensorService(context);
        this.webviewManager = new WebviewManager(context);
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new TensorEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            TensorEditorProvider.viewType,
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
    ): Promise<TensorDocument> {
        return new TensorDocument(uri);
    }

    async resolveCustomEditor(
        document: TensorDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'dist')
            ]
        };

        // 设置webview内容（等待依赖检查完成）
        webviewPanel.webview.html = await this.webviewManager.getTensorViewerHtml(
            webviewPanel.webview,
            document.uri.fsPath
        );

        // 加载张量数据
        this.loadTensorData(document.uri, webviewPanel.webview);

        // 处理webview消息
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleMessage(message, document.uri, webviewPanel.webview);
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async loadTensorData(uri: vscode.Uri, webview: vscode.Webview) {
        try {
            // 先发送依赖状态
            const checker = DependencyChecker.getInstance();
            const depStatus = checker.getCachedStatus();
            if (depStatus) {
                webview.postMessage({
                    type: 'dependencyStatus',
                    data: depStatus
                });
            }
            
            const data = await this.tensorService.loadTensor(uri.fsPath);
            webview.postMessage({
                type: 'tensorData',
                data: data
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
            case 'search':
                await this.handleSearch(message.query as string, message.options as { regex: boolean; caseSensitive: boolean }, uri, webview);
                break;
            case 'filter':
                await this.handleFilter(message.filter as { key?: string; shape?: number[]; dtype?: string }, uri, webview);
                break;
            case 'plot':
                // 从message.key和message.params获取参数
                await this.handlePlot(
                    {
                        type: (message.params as any)?.chartType || 'line',
                        keys: [message.key as string],
                        options: message.params as Record<string, unknown> || {}
                    },
                    uri,
                    webview
                );
                break;
            case 'refresh':
                await this.loadTensorData(uri, webview);
                break;
            case 'export':
                await this.handleExport(message.format as string, message.key as string, uri);
                break;
            case 'saveEdits':
                await this.handleSaveEdits(message.key as string, message.changes as Array<{ row: number; col: number; value: string }>, uri, webview);
                break;
            case 'slice':
                await this.handleSlice(message.key as string, message.slice as string, uri, webview);
                break;
        }
    }

    private async handleSaveEdits(
        key: string,
        changes: Array<{ row: number; col: number; value: string }>,
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        try {
            // 调用 tensorService 保存修改
            const result = await this.tensorService.saveEdits(uri.fsPath, key, changes);
            
            // 检查Python脚本返回的结果
            if (result.error) {
                throw new Error(result.error);
            }
            
            vscode.window.showInformationMessage(
                result.message || `已保存 ${changes.length} 个单元格的修改`,
                '确定'
            );
            
            webview.postMessage({
                type: 'saveResponse',
                success: true,
                modified: changes.length,
                message: result.message || '保存成功'
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`保存失败: ${errorMsg}`);
            webview.postMessage({
                type: 'saveResponse',
                success: false,
                error: errorMsg
            });
        }
    }

    private async handleSlice(
        key: string,
        sliceStr: string,
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        try {
            const data = await this.tensorService.getSlice(uri.fsPath, key, sliceStr);
            
            // 检查是否有错误
            if (data && typeof data === 'object' && 'error' in data) {
                webview.postMessage({
                    type: 'sliceData',
                    data: data  // 包含 error 字段
                });
            } else {
                webview.postMessage({
                    type: 'sliceData',
                    data: data
                });
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            webview.postMessage({
                type: 'sliceData',
                data: { error: errorMsg }
            });
        }
    }

    private async handleSearch(
        query: string,
        options: { regex: boolean; caseSensitive: boolean },
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        try {
            const results = await this.tensorService.search(uri.fsPath, query, options);
            webview.postMessage({
                type: 'searchResults',
                data: results
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `搜索失败: ${error}`
            });
        }
    }

    private async handleFilter(
        filter: { key?: string; shape?: number[]; dtype?: string },
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        try {
            const data = await this.tensorService.filter(uri.fsPath, filter);
            webview.postMessage({
                type: 'filteredData',
                data: data
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `筛选失败: ${error}`
            });
        }
    }

    private async handlePlot(
        plotConfig: { type: string; keys: string[]; options: Record<string, unknown> },
        uri: vscode.Uri,
        webview: vscode.Webview
    ) {
        try {
            const plotData = await this.tensorService.preparePlotData(uri.fsPath, plotConfig);
            webview.postMessage({
                type: 'plotData',
                data: plotData
            });
        } catch (error) {
            webview.postMessage({
                type: 'error',
                message: `绑图失败: ${error}`
            });
        }
    }

    private async handleExport(format: string, key: string, uri: vscode.Uri) {
        try {
            await this.tensorService.exportData(uri.fsPath, key, format);
            vscode.window.showInformationMessage('导出成功！');
        } catch (error) {
            vscode.window.showErrorMessage(`导出失败: ${error}`);
        }
    }
}

/**
 * 张量文档类
 */
class TensorDocument implements vscode.CustomDocument {
    constructor(public readonly uri: vscode.Uri) { }

    dispose(): void {
        // 清理资源
    }
}
