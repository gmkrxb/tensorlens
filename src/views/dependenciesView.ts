/**
 * 依赖状态视图提供器
 */
import * as vscode from 'vscode';
import { DependencyChecker } from '../services/dependencyChecker';

export class DependenciesViewProvider implements vscode.TreeDataProvider<DependencyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | null | void> = new vscode.EventEmitter<DependencyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private checker: DependencyChecker;

    constructor() {
        this.checker = DependencyChecker.getInstance();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DependencyItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DependencyItem): Promise<DependencyItem[]> {
        if (element) {
            return [];
        }

        // 获取依赖状态
        const status = await this.checker.checkAll();

        return [
            new DependencyItem(
                'Python',
                status.python ? '✅ 已安装' : '❌ 未安装',
                status.pythonVersion || '',
                status.python ? 'pass' : 'error',
                status.python ? undefined : {
                    command: 'tensorLens.checkDependencies',
                    title: '检查依赖',
                    arguments: []
                }
            ),
            new DependencyItem(
                'NumPy',
                status.numpy ? '✅ 已安装' : '❌ 未安装',
                status.numpyVersion || '',
                status.numpy ? 'pass' : 'warning',
                status.numpy ? undefined : {
                    command: 'tensorLens.installDependency',
                    title: '安装NumPy',
                    arguments: ['numpy']
                }
            ),
            new DependencyItem(
                'PyTorch',
                status.torch ? '✅ 已安装' : '⭕ 可选',
                status.torchVersion || '',
                status.torch ? 'pass' : 'info',
                status.torch ? undefined : {
                    command: 'tensorLens.installDependency',
                    title: '安装PyTorch',
                    arguments: ['torch']
                }
            ),
            new DependencyItem(
                '7-Zip',
                status.sevenZip ? '✅ 已安装' : '⭕ 可选',
                '',
                status.sevenZip ? 'pass' : 'info',
                status.sevenZip ? undefined : {
                    command: 'tensorLens.checkDependencies',
                    title: '检查依赖',
                    arguments: []
                }
            )
        ];
    }
}

class DependencyItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly status: string,
        public readonly version: string,
        public readonly state: 'pass' | 'warning' | 'error' | 'info',
        public readonly command?: vscode.Command
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.description = version;
        this.tooltip = `${label}: ${status}${version ? ` (${version})` : ''}`;
        
        // 设置图标
        switch (state) {
            case 'pass':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                break;
            case 'warning':
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('testing.iconSkipped'));
                break;
        }
    }
}
