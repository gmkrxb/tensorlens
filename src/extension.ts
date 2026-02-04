/**
 * 插件入口文件
 */
import * as vscode from 'vscode';
import { TensorEditorProvider } from './editors/tensorEditor';
import { ArchiveEditorProvider } from './editors/archiveEditor';
import { registerCommands } from './commands';
import { DependencyChecker } from './services/dependencyChecker';
import { I18nManager } from './utils/i18n';
import { SidebarViewProvider } from './views/sidebarView';
import zhCN from './locales/zh-cn/index';
import enUS from './locales/en/index';

export async function activate(context: vscode.ExtensionContext) {
    console.log('TensorLens extension is now active!');

    // 初始化国际化
    const i18n = I18nManager.getInstance(context);
    i18n.registerTranslations('zh-cn', zhCN);
    i18n.registerTranslations('en', enUS);

    // 获取工作区根目录
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // 注册自定义侧边栏 WebView
    const sidebarProvider = new SidebarViewProvider(context.extensionUri, workspaceRoot);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('tensorlens-sidebar', sidebarProvider)
    );

    // 初始化依赖检测器
    const checker = DependencyChecker.getInstance();

    // 注册依赖检测命令
    context.subscriptions.push(
        vscode.commands.registerCommand('tensorLens.checkDependencies', async () => {
            await checker.showStatusNotification();
        })
    );

    // 注册创建虚拟环境命令
    context.subscriptions.push(
        vscode.commands.registerCommand('tensorLens.createVirtualEnvironment', async () => {
            await checker.createVirtualEnvironment();
        })
    );

    // 注册张量文件编辑器
    context.subscriptions.push(
        TensorEditorProvider.register(context)
    );

    // 注册压缩文件编辑器
    context.subscriptions.push(
        ArchiveEditorProvider.register(context)
    );

    // 注册其他命令
    registerCommands(context);

    // 启动时异步检测依赖（不阻塞激活）
    setTimeout(async () => {
        try {
            const status = await checker.checkAll();

            // 如果缺少关键依赖，显示提示
            if (!status.python || !status.numpy) {
                const missing: string[] = [];
                if (!status.python) {
                    missing.push('Python');
                }
                if (!status.numpy) {
                    missing.push('NumPy');
                }

                const result = await vscode.window.showWarningMessage(
                    `TensorLens: 缺少依赖 ${missing.join(', ')}，部分功能不可用`,
                    '查看详情',
                    '忽略'
                );

                if (result === '查看详情') {
                    await checker.showStatusNotification();
                }
            } else if (!status.torch) {
                // PyTorch可选，只在状态栏显示
                vscode.window.setStatusBarMessage(
                    '$(warning) PyTorch 未安装，.pt/.pth 文件预览不可用',
                    10000
                );
            }
        } catch (error) {
            console.error('Dependency check failed:', error);
        }
    }, 2000);

    // 添加状态栏项
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'tensorLens.checkDependencies';
    statusBarItem.tooltip = '点击检查 TensorLens 依赖状态';
    context.subscriptions.push(statusBarItem);

    // 更新状态栏
    const updateStatusBar = async () => {
        const status = checker.getCachedStatus();
        if (!status) {
            statusBarItem.text = '$(sync~spin) 检测依赖...';
            statusBarItem.show();
            return;
        }

        if (!status.python || !status.numpy) {
            statusBarItem.text = '$(error) TensorLens: 依赖缺失';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (!status.torch) {
            statusBarItem.text = '$(warning) TensorLens: PyTorch 未安装';
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            statusBarItem.text = '$(check) TensorLens';
            statusBarItem.backgroundColor = undefined;
        }
        statusBarItem.show();
    };

    // 初始显示
    updateStatusBar();

    // 依赖检测完成后更新
    setTimeout(updateStatusBar, 3000);
}

export function deactivate() {
    console.log('TensorLens extension is now deactivated!');
}
