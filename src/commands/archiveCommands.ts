/**
 * 压缩文件相关命令
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ArchiveService } from '../services/archiveService';

export class ArchiveCommands {
    private archiveService: ArchiveService;

    constructor(private context: vscode.ExtensionContext) {
        this.archiveService = new ArchiveService();
    }

    /**
     * 解压压缩文件
     */
    async extractArchive(uri?: vscode.Uri) {
        if (!uri) {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Archive': ['zip', 'rar', '7z', 'tar', 'gz']
                }
            });

            if (files && files.length > 0) {
                uri = files[0];
            } else {
                return;
            }
        }

        // 获取当前目录和默认子文件夹名
        const currentDir = path.dirname(uri.fsPath);
        const baseName = path.basename(uri.fsPath).replace(/\.[^.]+$/, '');

        // 显示选项
        const options = [
            { label: '$(folder) 当前目录', description: currentDir, value: 'current' },
            { label: '$(new-folder) 新建子目录', description: `${currentDir}/${baseName}`, value: 'subfolder' },
            { label: '$(folder-opened) 选择其他目录...', value: 'browse' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: '选择解压目标目录',
            title: '解压到...'
        });

        if (!selected) {
            return;
        }

        let targetPath: string;

        switch (selected.value) {
            case 'current':
                targetPath = currentDir;
                break;

            case 'subfolder': {
                // 让用户输入或确认子文件夹名
                const folderName = await vscode.window.showInputBox({
                    prompt: '输入子文件夹名称',
                    value: baseName,
                    validateInput: (value) => {
                        if (!value.trim()) {
                            return '文件夹名称不能为空';
                        }
                        if (/[<>:"/\\|?*]/.test(value)) {
                            return '文件夹名称包含非法字符';
                        }
                        return null;
                    }
                });

                if (!folderName) {
                    return;
                }

                targetPath = path.join(currentDir, folderName);

                // 检查目录是否存在
                if (fs.existsSync(targetPath)) {
                    const overwrite = await vscode.window.showWarningMessage(
                        `目录 "${folderName}" 已存在，是否继续解压？`,
                        '继续',
                        '取消'
                    );
                    if (overwrite !== '继续') {
                        return;
                    }
                } else {
                    // 创建目录
                    fs.mkdirSync(targetPath, { recursive: true });
                }
                break;
            }

            case 'browse': {
                const targetFolder = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    defaultUri: vscode.Uri.file(currentDir),
                    openLabel: '选择解压目标目录'
                });

                if (!targetFolder || targetFolder.length === 0) {
                    return;
                }
                targetPath = targetFolder[0].fsPath;
                break;
            }

            default:
                return;
        }

        // 执行解压
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '正在解压...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: path.basename(uri!.fsPath) });
                await this.archiveService.extract(uri!.fsPath, targetPath);
            });

            // 解压完成，提供选项
            const action = await vscode.window.showInformationMessage(
                `解压完成！文件已解压到: ${targetPath}`,
                '打开目录',
                '在资源管理器中显示'
            );

            if (action === '打开目录') {
                // 在VSCode中打开目录
                const folderUri = vscode.Uri.file(targetPath);
                await vscode.commands.executeCommand('revealInExplorer', folderUri);
            } else if (action === '在资源管理器中显示') {
                // 在系统资源管理器中打开
                await vscode.env.openExternal(vscode.Uri.file(targetPath));
            }
        } catch (error) {
            vscode.window.showErrorMessage(`解压失败: ${error}`);
        }
    }

    /**
     * 预览压缩文件内容
     */
    async previewArchive(uri?: vscode.Uri, entryPath?: string) {
        if (!uri) {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Archive': ['zip', 'rar', '7z', 'tar', 'gz']
                }
            });

            if (files && files.length > 0) {
                uri = files[0];
            } else {
                return;
            }
        }

        // 如果指定了entryPath，检查是否是张量文件
        if (entryPath) {
            const fileExt = path.extname(entryPath).toLowerCase();
            if (['.npy', '.npz', '.pt', '.pth'].includes(fileExt)) {
                // 预览张量文件（只读模式）
                await this.previewTensorInArchive(uri.fsPath, entryPath);
                return;
            }
        }

        // 使用自定义编辑器打开
        await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            'tensorLens.archiveEditor'
        );
    }

    /**
     * 预览压缩包内的张量文件（只读）
     */
    private async previewTensorInArchive(archivePath: string, entryPath: string) {
        try {
            // 显示加载提示
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `正在预览: ${path.basename(entryPath)}`,
                cancellable: false
            }, async () => {
                // 读取文件内容
                const preview = await this.archiveService.readFileContent(archivePath, entryPath);
                
                // 创建虚拟文档URI
                const virtualUri = vscode.Uri.parse(
                    `tensorlens-archive://${Buffer.from(archivePath).toString('base64')}/${entryPath}?readonly=true`
                );
                
                // 在自定义编辑器中打开
                await vscode.commands.executeCommand(
                    'vscode.openWith',
                    virtualUri,
                    'tensorLens.tensorEditor'
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`预览失败: ${error}`);
        }
    }

    /**
     * 解压单个文件到指定目录
     */
    async extractSingleFile(
        archivePath: string,
        entryPath: string,
        defaultTargetDir?: string
    ): Promise<string | null> {
        const currentDir = defaultTargetDir || path.dirname(archivePath);

        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: vscode.Uri.file(currentDir),
            openLabel: '选择解压目标目录'
        });

        if (!targetFolder || targetFolder.length === 0) {
            return null;
        }

        const targetPath = targetFolder[0].fsPath;

        try {
            await this.archiveService.extractSingle(archivePath, entryPath, targetPath);
            vscode.window.showInformationMessage(
                `已解压: ${path.basename(entryPath)} -> ${targetPath}`
            );
            return path.join(targetPath, path.basename(entryPath));
        } catch (error) {
            vscode.window.showErrorMessage(`解压失败: ${error}`);
            return null;
        }
    }
}
