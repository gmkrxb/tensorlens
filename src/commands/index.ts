/**
 * 命令注册模块
 */
import * as vscode from 'vscode';
import { TensorCommands } from './tensorCommands';
import { ArchiveCommands } from './archiveCommands';

export function registerCommands(context: vscode.ExtensionContext) {
    const tensorCommands = new TensorCommands(context);
    const archiveCommands = new ArchiveCommands(context);

    // 张量文件命令
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'tensorLens.openFile',
            tensorCommands.openFile.bind(tensorCommands)
        )
    );

    // 压缩文件命令
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'tensorLens.extractArchive',
            archiveCommands.extractArchive.bind(archiveCommands)
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'tensorLens.previewArchive',
            archiveCommands.previewArchive.bind(archiveCommands)
        )
    );

    // 解压单个文件命令（内部使用）
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'tensorLens.extractSingleFile',
            async (archivePath: string, entryPath: string, defaultTargetDir?: string) => {
                return archiveCommands.extractSingleFile(archivePath, entryPath, defaultTargetDir);
            }
        )
    );

    // 语言切换命令
    context.subscriptions.push(
        vscode.commands.registerCommand('tensorLens.switchLanguage', async () => {
            const I18nManager = await import('../utils/i18n').then(m => m.I18nManager);
            const i18n = I18nManager.getInstance(context);
            const currentLang = i18n.getCurrentLanguage();
            const newLang = currentLang === 'zh-cn' ? 'en' : 'zh-cn';
            i18n.setLanguage(newLang);
            
            const action = await vscode.window.showInformationMessage(
                `Language switched to ${newLang === 'zh-cn' ? '中文' : 'English'}. Reload required.`,
                'Reload Window'
            );
            if (action === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );

    // 依赖安装命令
    context.subscriptions.push(
        vscode.commands.registerCommand('tensorLens.installDependency', async (dep: string) => {
            const DependencyChecker = await import('../services/dependencyChecker').then(m => m.DependencyChecker);
            const checker = DependencyChecker.getInstance();
            
            switch (dep) {
                case 'python':
                    vscode.window.showInformationMessage('请手动安装 Python: https://www.python.org/downloads/');
                    break;
                case 'numpy':
                    await checker.installDependency('numpy');
                    break;
                case 'torch':
                    await checker.installDependency('torch');
                    break;
                case '7zip':
                    await checker.installDependency('7zip');
                    break;
            }
        })
    );
}

export { TensorCommands, ArchiveCommands };
