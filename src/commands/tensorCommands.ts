/**
 * 张量文件相关命令
 */
import * as vscode from 'vscode';

export class TensorCommands {
    constructor(private context: vscode.ExtensionContext) { }

    /**
     * 打开张量文件预览
     */
    async openFile(uri?: vscode.Uri) {
        if (!uri) {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Tensor': ['npy', 'npz', 'pt', 'pth']
                }
            });

            if (files && files.length > 0) {
                uri = files[0];
            } else {
                return;
            }
        }

        // 使用自定义编辑器打开
        await vscode.commands.executeCommand(
            'vscode.openWith',
            uri,
            'tensorLens.tensorEditor'
        );
    }
}
