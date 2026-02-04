/**
 * 自定义侧边栏 WebView 提供器
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyChecker } from '../services/dependencyChecker';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'tensorlens-sidebar';
    private _view?: vscode.WebviewView;
    private checker: DependencyChecker;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private workspaceRoot: string | undefined
    ) {
        this.checker = DependencyChecker.getInstance();
        
        // 监听Python配置变化
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('python')) {
                console.log('Python配置已更改，刷新侧边栏');
                setTimeout(() => this.updateView(), 500);
            }
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 处理来自 webview 的消息
        webviewView.webview.onDidReceiveMessage(async data => {
            try {
                switch (data.command) {
                    case 'init':
                    case 'refresh':
                        await this.updateView();
                        break;
                    case 'openFile':
                        vscode.commands.executeCommand('tensorLens.openFile', vscode.Uri.file(data.path));
                        break;
                    case 'previewArchive':
                        vscode.commands.executeCommand('tensorLens.previewArchive', vscode.Uri.file(data.path));
                        break;
                    case 'installDep':
                        vscode.commands.executeCommand('tensorLens.installDependency', data.dep);
                        setTimeout(() => this.updateView(), 1000);
                        break;
                    case 'selectPython':
                        await this.selectPythonInterpreter();
                        setTimeout(() => this.updateView(), 500);
                        break;
                }
            } catch (error) {
                console.error('处理侧边栏消息失败:', error);
                this.sendDefaultData();
            }
        });

        // 主动触发初始化更新
        setTimeout(() => {
            this.updateView().catch(err => {
                console.error('初始化侧边栏失败:', err);
                this.sendDefaultData();
            });
        }, 100);
    }

    private async updateView() {
        if (this._view) {
            try {
                const data = await Promise.race([
                    this.collectData(),
                    new Promise<any>((_, reject) => 
                        setTimeout(() => reject(new Error('数据加载超时')), 15000) // 15秒超时
                    )
                ]);
                this._view.webview.postMessage({ type: 'update', data });
            } catch (error) {
                console.error('更新侧边栏视图失败:', error);
                this.sendDefaultData();
            }
        }
    }

    private sendDefaultData() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'update',
                data: {
                    tensorFiles: [],
                    archiveFiles: [],
                    dependencies: this.getDefaultDependencies()
                }
            });
        }
    }

    private async collectData() {
        const [tensorFiles, archiveFiles, dependencies] = await Promise.all([
            this.findFiles(['.npz', '.npy', '.pt', '.pth']).catch(() => []),
            this.findFiles(['.zip', '.rar', '.7z', '.tar', '.gz']).catch(() => []),
            this.getDependencyStatus().catch(() => this.getDefaultDependencies())
        ]);

        return {
            tensorFiles: tensorFiles.map(f => ({
                name: path.basename(f),
                path: f,
                size: this.formatSize(f),
                type: path.extname(f).toUpperCase().substring(1),
                icon: this.getFileIcon(f)
            })),
            archiveFiles: archiveFiles.map(f => ({
                name: path.basename(f),
                path: f,
                size: this.formatSize(f),
                icon: this.getArchiveIcon(f)
            })),
            dependencies
        };
    }

    private async findFiles(extensions: string[]): Promise<string[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const files: string[] = [];
        const scan = async (dir: string) => {
            try {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        await scan(fullPath);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (extensions.includes(ext)) {
                            files.push(fullPath);
                        }
                    }
                }
            } catch {
                // 忽略无权限目录
            }
        };

        await scan(this.workspaceRoot);
        return files.slice(0, 20);
    }

    private async selectPythonInterpreter() {
        try {
            const pythonExt = vscode.extensions.getExtension('ms-python.python');
            if (pythonExt) {
                if (!pythonExt.isActive) {
                    await pythonExt.activate();
                }
                await vscode.commands.executeCommand('python.setInterpreter');
                vscode.window.showInformationMessage('Python 解释器已更新');
            } else {
                vscode.window.showWarningMessage('请先安装 Python 扩展');
            }
        } catch (error) {
            console.error('选择 Python 解释器失败:', error);
        }
    }

    private async getPythonVersionDirect(pythonPath: string): Promise<string | null> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const proc = spawn(pythonPath, ['--version']);
            let output = '';
            
            proc.stdout?.on('data', (data: Buffer) => {
                output += data.toString();
            });
            
            proc.stderr?.on('data', (data: Buffer) => {
                output += data.toString();
            });
            
            proc.on('close', () => {
                const match = output.match(/Python\s+(\d+\.\d+\.\d+)/);
                resolve(match ? match[1] : null);
            });
            
            setTimeout(() => resolve(null), 2000);
        });
    }

    private getDefaultDependencies() {
        return {
            python: {
                name: 'Python',
                status: 'missing' as const,
                statusText: '检测中...',
                version: '',
                action: 'selectPython',
                actionText: '选择'
            },
            numpy: {
                name: 'NumPy',
                status: 'missing' as const,
                statusText: '未检测',
                version: '',
                action: 'numpy',
                actionText: '安装'
            },
            torch: {
                name: 'PyTorch',
                status: 'optional' as const,
                statusText: '未检测',
                version: '',
                action: 'torch',
                actionText: '安装'
            },
            sevenZip: {
                name: '7-Zip',
                status: 'optional' as const,
                statusText: '未检测',
                version: '',
                action: '7zip',
                actionText: '安装'
            }
        };
    }

    private async getDependencyStatus() {
        try {
            console.log('开始检测依赖状态...');
            const status = await Promise.race([
                this.checker.checkAll(true), // 强制重新检查
                new Promise<any>((_, reject) => 
                    setTimeout(() => reject(new Error('依赖检查超时')), 30000) // 30秒超时
                )
            ]);
            console.log('依赖检测结果:', status);

            // 获取Python解释器信息
            let pythonName = 'Python';
            let pythonVersion = '';
            
            try {
                // 尝试从Python扩展获取当前解释器
                const pythonExt = vscode.extensions.getExtension('ms-python.python');
                if (pythonExt && pythonExt.isActive) {
                    const pythonApi = pythonExt.exports;
                    if (pythonApi && pythonApi.settings) {
                        const activeInterpreter = await pythonApi.settings.getExecutionDetails?.(vscode.workspace.workspaceFolders?.[0]?.uri);
                        if (activeInterpreter && activeInterpreter.execCommand) {
                            const cmd = activeInterpreter.execCommand[0];
                            pythonName = path.basename(cmd);
                            
                            // 直接从Python扩展API获取版本
                            const interpreterInfo = await pythonApi.environments?.resolveEnvironment?.(activeInterpreter.execCommand[0]);
                            if (interpreterInfo && interpreterInfo.version) {
                                pythonVersion = `${interpreterInfo.version.major}.${interpreterInfo.version.minor}.${interpreterInfo.version.micro}`;
                            } else {
                                // 备用方案：执行python --version获取
                                pythonVersion = await this.getPythonVersionDirect(cmd) || status.pythonVersion || '';
                            }
                            console.log('当前Python解释器:', pythonName, pythonVersion);
                        }
                    }
                }
                
                // 如果Python扩展没有提供版本，使用status中的版本
                if (!pythonVersion && status.pythonVersion) {
                    pythonVersion = status.pythonVersion;
                }
            } catch (err) {
                console.log('无法获取Python解释器信息:', err);
                pythonVersion = status.pythonVersion || '';
            }

            return {
                python: {
                    name: pythonName + (pythonVersion ? ' ' + pythonVersion : ''),
                    status: status.python ? 'installed' as const : 'missing' as const,
                    statusText: status.python ? '已安装' : '未安装',
                    version: pythonVersion,
                    action: 'selectPython',
                    actionText: status.python ? '切换' : '选择'
                },
                numpy: {
                    name: 'NumPy',
                    status: status.numpy ? 'installed' as const : 'missing' as const,
                    statusText: status.numpy ? '已安装' : '未安装',
                    version: status.numpyVersion || '',
                    action: status.numpy ? null : 'numpy',
                    actionText: '安装'
                },
                torch: {
                    name: 'PyTorch',
                    status: status.torch ? 'installed' as const : 'optional' as const,
                    statusText: status.torch ? '已安装' : '可选',
                    version: status.torchVersion || '',
                    action: status.torch ? null : 'torch',
                    actionText: '安装'
                },
                sevenZip: {
                    name: '7-Zip',
                    status: status.sevenZip ? 'installed' as const : 'optional' as const,
                    statusText: status.sevenZip ? '已安装' : '可选',
                    version: status.sevenZipVersion || '',
                    action: status.sevenZip ? null : '7zip',
                    actionText: '安装'
                }
            };
        } catch (error) {
            console.error('获取依赖状态失败:', error);
            return this.getDefaultDependencies();
        }
    }

    private formatSize(filePath: string): string {
        try {
            const stats = fs.statSync(filePath);
            const size = stats.size;
            if (size < 1024) {
                return `${size}B`;
            }
            if (size < 1024 * 1024) {
                return `${(size / 1024).toFixed(1)}KB`;
            }
            if (size < 1024 * 1024 * 1024) {
                return `${(size / (1024 * 1024)).toFixed(1)}MB`;
            }
            return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
        } catch {
            return '';
        }
    }

    private getFileIcon(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pt' || ext === '.pth') {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--vscode-charts-orange)">
                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4zm0 2.2l6 3v5.3c0 4.6-3.1 9-6 10.3-2.9-1.3-6-5.7-6-10.3V7.2l6-3z"/>
                <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
            </svg>`;
        }
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--vscode-charts-blue)">
            <path d="M4 4h4v4H4V4zm0 6h4v4H4v-4zm0 6h4v4H4v-4zm6-12h4v4h-4V4zm0 6h4v4h-4v-4zm0 6h4v4h-4v-4zm6-12h4v4h-4V4zm0 6h4v4h-4v-4zm0 6h4v4h-4v-4z"/>
            <circle cx="6" cy="6" r="1.5" fill="var(--vscode-charts-green)"/>
            <circle cx="12" cy="12" r="1.5" fill="var(--vscode-charts-yellow)"/>
            <circle cx="18" cy="18" r="1.5" fill="var(--vscode-charts-red)"/>
        </svg>`;
    }

    private getArchiveIcon(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.zip') {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--vscode-charts-purple)">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                <rect x="10" y="6" width="2" height="2"/><rect x="10" y="10" width="2" height="2"/>
                <rect x="10" y="14" width="2" height="2"/><rect x="10" y="18" width="2" height="2"/>
            </svg>`;
        }
        if (ext === '.rar' || ext === '.7z') {
            return `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--vscode-charts-orange)">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/>
                <path d="M14 2v6h6M10 11v8l4-4-4-4z" fill="var(--vscode-editor-background)"/>
            </svg>`;
        }
        return `<svg width="24" height="24" viewBox="0 0 24 24" fill="var(--vscode-charts-green)">
            <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
            <path d="M8 13h8v2H8v-2z" fill="var(--vscode-editor-background)"/>
        </svg>`;
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'templates', 'sidebarView.html');
        const html = fs.readFileSync(htmlPath.fsPath, 'utf8');
        return html;
    }
}
