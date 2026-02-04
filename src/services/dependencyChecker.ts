/**
 * 依赖检测服务
 * 检测Python、NumPy、PyTorch等依赖是否可用
 */
import * as vscode from 'vscode';
import { spawn, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { I18nManager } from '../utils/i18n';

export interface DependencyStatus {
    python: boolean;
    pythonVersion?: string;
    numpy: boolean;
    numpyVersion?: string;
    torch: boolean;
    torchVersion?: string;
    sevenZip: boolean;
    sevenZipVersion?: string;
}

export class DependencyChecker {
    private static instance: DependencyChecker;
    private status: DependencyStatus | null = null;
    private checking = false;

    private constructor() { }

    static getInstance(): DependencyChecker {
        if (!DependencyChecker.instance) {
            DependencyChecker.instance = new DependencyChecker();
        }
        return DependencyChecker.instance;
    }

    /**
     * 获取虚拟环境路径
     */
    private getVenvPath(): string | null {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return null;
        }
        return path.join(workspaceFolder.uri.fsPath, '.tensorlens-venv');
    }

    /**
     * 检查虚拟环境是否存在
     */
    private venvExists(): boolean {
        const venvPath = this.getVenvPath();
        if (!venvPath) {
            return false;
        }
        const pythonPath = process.platform === 'win32'
            ? path.join(venvPath, 'Scripts', 'python.exe')
            : path.join(venvPath, 'bin', 'python');
        return fs.existsSync(pythonPath);
    }

    /**
     * 获取Python路径
     */
    async getPythonPath(): Promise<string> {
        // 优先使用虚拟环境
        if (this.venvExists()) {
            const venvPath = this.getVenvPath()!;
            const pythonPath = process.platform === 'win32'
                ? path.join(venvPath, 'Scripts', 'python.exe')
                : path.join(venvPath, 'bin', 'python');
            return pythonPath;
        }

        // 其次尝试从Python扩展获取
        try {
            const pythonExt = vscode.extensions.getExtension('ms-python.python');
            if (pythonExt) {
                if (!pythonExt.isActive) {
                    await pythonExt.activate();
                }
                const pythonApi = pythonExt.exports;
                if (pythonApi && pythonApi.settings) {
                    const activeInterpreter = await pythonApi.settings.getExecutionDetails?.(vscode.workspace.workspaceFolders?.[0]?.uri);
                    if (activeInterpreter && activeInterpreter.execCommand && activeInterpreter.execCommand[0]) {
                        console.log('使用Python扩展API路径:', activeInterpreter.execCommand[0]);
                        return activeInterpreter.execCommand[0];
                    }
                }
            }
        } catch (err) {
            console.log('无法从Python扩展获取路径:', err);
        }

        // 最后使用配置的路径或默认python
        const config = vscode.workspace.getConfiguration('tensorLens');
        return config.get('pythonPath', 'python');
    }

    /**
     * 检测所有依赖
     */
    async checkAll(force = false): Promise<DependencyStatus> {
        if (this.status && !force) {
            return this.status;
        }

        if (this.checking) {
            // 等待其他检测完成
            while (this.checking) {
                await new Promise(r => setTimeout(r, 100));
            }
            return this.status!;
        }

        this.checking = true;

        try {
            const [python, numpy, torch, sevenZip] = await Promise.all([
                this.checkPython(),
                this.checkNumpy(),
                this.checkTorch(),
                this.check7Zip()
            ]);

            this.status = {
                python: python.available,
                pythonVersion: python.version,
                numpy: numpy.available,
                numpyVersion: numpy.version,
                torch: torch.available,
                torchVersion: torch.version,
                sevenZip: sevenZip.available,
                sevenZipVersion: sevenZip.version
            };

            return this.status;
        } finally {
            this.checking = false;
        }
    }

    /**
     * 获取缓存的状态
     */
    getCachedStatus(): DependencyStatus | null {
        return this.status;
    }

    /**
     * 创建虚拟环境
     */
    async createVirtualEnvironment(): Promise<boolean> {
        const i18n = I18nManager.getInstance();
        const venvPath = this.getVenvPath();
        if (!venvPath) {
            vscode.window.showErrorMessage(i18n.t('dependency.noWorkspaceFolder'));
            return false;
        }

        // 检查系统Python
        const systemPython = await this.checkSystemPython();
        if (!systemPython.available) {
            const result = await vscode.window.showErrorMessage(
                i18n.t('dependency.pythonNotFound'),
                i18n.t('dependency.installPython')
            );
            if (result === i18n.t('dependency.installPython')) {
                vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
            }
            return false;
        }

        return new Promise((resolve) => {
            const terminal = vscode.window.createTerminal('TensorLens - Create Virtual Environment');
            terminal.show();

            const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
            terminal.sendText(`${pythonCmd} -m venv "${venvPath}"`);

            vscode.window.showInformationMessage(
                i18n.t('dependency.creatingVenv'),
                i18n.t('common.complete'),
                i18n.t('common.cancel')
            ).then(async (result) => {
                if (result === i18n.t('common.complete')) {
                    // 验证虚拟环境是否创建成功
                    if (this.venvExists()) {
                        vscode.window.showInformationMessage(i18n.t('dependency.venvCreatedSuccess'));
                        // 重新检测依赖
                        await this.checkAll(true);
                        resolve(true);
                    } else {
                        vscode.window.showErrorMessage(i18n.t('dependency.venvCreatedFail'));
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            });
        });
    }

    /**
     * 检测系统Python（不使用虚拟环境）
     */
    private async checkSystemPython(): Promise<{ available: boolean; version?: string }> {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        return this.runCheck(`${pythonCmd} --version`);
    }

    /**
     * 检测Python
     */
    private async checkPython(): Promise<{ available: boolean; version?: string }> {
        const pythonPath = await this.getPythonPath();
        return this.runDirectCheck(pythonPath, ['--version']);
    }

    /**
     * 检测NumPy
     */
    private async checkNumpy(): Promise<{ available: boolean; version?: string }> {
        const pythonPath = await this.getPythonPath();
        return this.runDirectCheck(pythonPath, ['-c', 'import numpy; print(numpy.__version__)']);
    }

    /**
     * 检测PyTorch
     */
    private async checkTorch(): Promise<{ available: boolean; version?: string }> {
        const pythonPath = await this.getPythonPath();
        return this.runDirectCheck(pythonPath, ['-c', 'import torch; print(torch.__version__)']);
    }

    /**
     * 检测7-Zip
     */
    private async check7Zip(): Promise<{ available: boolean; version?: string }> {
        if (process.platform === 'win32') {
            // Windows平台：检查常见安装位置
            const possiblePaths = [
                'C:\\Program Files\\7-Zip\\7z.exe',
                'C:\\Program Files (x86)\\7-Zip\\7z.exe'
            ];
            
            for (const p of possiblePaths) {
                if (require('fs').existsSync(p)) {
                    console.log('找到7-Zip路径:', p);
                    // 7z.exe直接运行会返回非0退出码，检查文件存在即可
                    return {
                        available: true,
                        version: '已安装'
                    };
                }
            }
            
            // 尝试从PATH检查（检查文件存在而不是运行）
            try {
                const { execSync } = require('child_process');
                const output = execSync('where 7z', { encoding: 'utf8' });
                if (output && output.trim()) {
                    console.log('在PATH中找到7z:', output.trim());
                    return { available: true, version: '已安装' };
                }
            } catch {}
            
            return { available: false };
        } else {
            // Linux/Mac: 使用which命令检查
            try {
                const { execSync } = require('child_process');
                execSync('which 7z', { encoding: 'utf8' });
                return { available: true, version: '已安装' };
            } catch {
                try {
                    const { execSync } = require('child_process');
                    execSync('which 7za', { encoding: 'utf8' });
                    return { available: true, version: '已安装' };
                } catch {
                    return { available: false };
                }
            }
        }
    }

    /**
     * 直接运行检测命令（不通过 shell）
     */
    private runDirectCheck(executable: string, args: string[]): Promise<{ available: boolean; version?: string }> {
        return new Promise((resolve) => {
            const proc = spawn(executable, args);
            
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    // 合并stdout和stderr（Python --version输出到stderr）
                    const output = (stdout + stderr).trim();
                    const version = output.replace(/^Python\s*/i, '');
                    console.log(`检测命令: ${executable} ${args.join(' ')} 结果: ${version}`);
                    resolve({ available: true, version: version || undefined });
                } else {
                    console.log(`检测命令失败: ${executable} ${args.join(' ')} 退出码: ${code}`);
                    resolve({ available: false });
                }
            });

            proc.on('error', (err) => {
                console.log(`检测命令错误: ${executable} - ${err.message}`);
                resolve({ available: false });
            });

            // 超时处理
            setTimeout(() => {
                proc.kill();
                resolve({ available: false });
            }, 10000);
        });
    }

    /**
     * 运行检测命令（通过 shell，用于旧方法）
     */
    private runCheck(command: string): Promise<{ available: boolean; version?: string }> {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            
            let proc;
            if (isWindows) {
                // Windows: 使用 cmd /c ""命令"" 的格式执行带引号的路径
                proc = spawn('cmd.exe', ['/c', command]);
            } else {
                proc = spawn('/bin/sh', ['-c', command]);
            }
            
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    // 合并stdout和stderr（Python --version输出到stderr）
                    const output = (stdout + stderr).trim();
                    const version = output.replace(/^Python\s*/i, '');
                    console.log(`检测命令: ${command.substring(0, 50)}... 结果: ${version}`);
                    resolve({ available: true, version: version || undefined });
                } else {
                    console.log(`检测命令失败: ${command.substring(0, 50)}... 退出码: ${code}, stderr: ${stderr.substring(0, 100)}`);
                    resolve({ available: false });
                }
            });

            proc.on('error', () => {
                resolve({ available: false });
            });

            // 超时处理
            setTimeout(() => {
                proc.kill();
                resolve({ available: false });
            }, 10000);
        });
    }

    /**
     * 安装依赖
     */
    async installDependency(dep: 'numpy' | 'torch' | '7zip'): Promise<boolean> {
        if (dep === '7zip') {
            return this.install7Zip();
        }

        const pythonPath = await this.getPythonPath();
        const packages: { [key: string]: string } = {
            numpy: 'numpy',
            torch: 'torch'
        };

        const terminal = vscode.window.createTerminal('Install Dependencies');
        terminal.show();
        terminal.sendText(`"${pythonPath}" -m pip install ${packages[dep]}`);

        // 提示用户
        const result = await vscode.window.showInformationMessage(
            `正在安装 ${dep}，安装完成后请点击"重新检测"`,
            '重新检测',
            '关闭'
        );

        if (result === '重新检测') {
            await this.checkAll(true);
            return this.status?.[dep] ?? false;
        }

        return false;
    }

    /**
     * 安装7-Zip
     */
    private async install7Zip(): Promise<boolean> {
        const i18n = I18nManager.getInstance();
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            const result = await vscode.window.showInformationMessage(
                i18n.t('dependency.sevenZipNotInstalledPrompt'),
                i18n.t('dependency.openWebsite'),
                i18n.t('dependency.useWinget'),
                i18n.t('common.cancel')
            );

            if (result === i18n.t('dependency.openWebsite')) {
                vscode.env.openExternal(vscode.Uri.parse('https://www.7-zip.org/'));
                return false;
            } else if (result === i18n.t('dependency.useWinget')) {
                const terminal = vscode.window.createTerminal('Install 7-Zip');
                terminal.show();
                terminal.sendText('winget install --id 7zip.7zip');
                
                const checkResult = await vscode.window.showInformationMessage(
                    i18n.t('dependency.installCompletePrompt'),
                    i18n.t('common.recheck'),
                    i18n.t('common.close')
                );

                if (checkResult === i18n.t('common.recheck')) {
                    await this.checkAll(true);
                    return this.status?.sevenZip ?? false;
                }
            }
        } else {
            const result = await vscode.window.showInformationMessage(
                i18n.t('dependency.sevenZipNotInstalledLinux'),
                i18n.t('dependency.usePackageManager'),
                i18n.t('common.cancel')
            );

            if (result === i18n.t('dependency.usePackageManager')) {
                const terminal = vscode.window.createTerminal('Install 7-Zip');
                terminal.show();
                
                // 根据系统选择合适的包管理器
                const installCmd = process.platform === 'darwin' 
                    ? 'brew install p7zip'
                    : 'sudo apt-get install p7zip-full || sudo yum install p7zip';
                
                terminal.sendText(installCmd);
                
                const checkResult = await vscode.window.showInformationMessage(
                    i18n.t('dependency.installCompletePrompt'),
                    i18n.t('common.recheck'),
                    i18n.t('common.close')
                );

                if (checkResult === i18n.t('common.recheck')) {
                    await this.checkAll(true);
                    return this.status?.sevenZip ?? false;
                }
            }
        }

        return false;
    }

    /**
     * 显示依赖状态通知
     */
    async showStatusNotification(): Promise<void> {
        const i18n = I18nManager.getInstance();
        const status = await this.checkAll();

        // 如果没有Python环境
        if (!status.python) {
            const hasVenv = this.venvExists();
            const systemPython = await this.checkSystemPython();

            if (!systemPython.available) {
                // 系统没有Python
                const result = await vscode.window.showErrorMessage(
                    i18n.t('dependency.pythonNotFound'),
                    i18n.t('dependency.installPython'),
                    i18n.t('dependency.configurePythonPath'),
                    i18n.t('common.ignore')
                );

                if (result === i18n.t('dependency.installPython')) {
                    vscode.env.openExternal(vscode.Uri.parse('https://www.python.org/downloads/'));
                } else if (result === i18n.t('dependency.configurePythonPath')) {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'tensorLens.pythonPath'
                    );
                }
                return;
            }

            // 有系统Python但未配置
            if (!hasVenv) {
                const result = await vscode.window.showInformationMessage(
                    i18n.t('dependency.systemPythonDetected', systemPython.version || 'unknown'),
                    i18n.t('dependency.createVirtualEnv'),
                    i18n.t('dependency.useSystemPython'),
                    i18n.t('common.cancel')
                );

                if (result === i18n.t('dependency.createVirtualEnv')) {
                    const created = await this.createVirtualEnvironment();
                    if (created) {
                        // 虚拟环境创建后自动安装numpy
                        await this.installDependency('numpy');
                    }
                    return;
                } else if (result === i18n.t('dependency.useSystemPython')) {
                    // 配置使用系统Python
                    const config = vscode.workspace.getConfiguration('tensorLens');
                    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                    await config.update('pythonPath', pythonCmd, vscode.ConfigurationTarget.Workspace);
                    // 重新检测
                    await this.checkAll(true);
                    await this.showStatusNotification();
                    return;
                }
            }
            return;
        }

        // 有Python环境，检查numpy
        const missing: string[] = [];
        if (!status.numpy) {
            missing.push('NumPy');
        }

        if (missing.length === 0) {
            const torchInfo = status.torch
                ? i18n.t('dependency.torchInstalled', status.torchVersion || 'unknown')
                : i18n.t('dependency.torchNotInstalled');

            const sevenZipInfo = status.sevenZip
                ? i18n.t('dependency.sevenZipInstalled')
                : i18n.t('dependency.sevenZipNotInstalled');

            const envInfo = this.venvExists() ? i18n.t('dependency.virtualEnv') : '';
            
            // 如果7-Zip未安装，询问是否需要安装
            if (!status.sevenZip) {
                const result = await vscode.window.showInformationMessage(
                    i18n.t('dependency.checkCompleteWithSevenZip', 
                        status.pythonVersion || 'unknown', envInfo, status.numpyVersion || 'unknown', torchInfo, sevenZipInfo),
                    i18n.t('dependency.install7Zip'),
                    i18n.t('common.close')
                );
                if (result === i18n.t('dependency.install7Zip')) {
                    await this.installDependency('7zip');
                }
            } else {
                vscode.window.showInformationMessage(
                    i18n.t('dependency.checkComplete', 
                        status.pythonVersion || 'unknown', envInfo, status.numpyVersion || 'unknown', torchInfo) + ', ' + sevenZipInfo
                );
            }
        } else {
            const result = await vscode.window.showWarningMessage(
                i18n.t('dependency.missingDependencies', missing.join(', ')),
                i18n.t('dependency.installDependencies'),
                i18n.t('common.ignore')
            );

            if (result === i18n.t('dependency.installDependencies')) {
                if (!status.numpy) {
                    await this.installDependency('numpy');
                }
            }
        }
    }

    /**
     * 获取功能可用性
     */
    getFeatureAvailability(): {
        npz: boolean;
        npy: boolean;
        pt: boolean;
        pth: boolean;
        reason?: string;
    } {
        const status = this.status;

        if (!status) {
            return {
                npz: false,
                npy: false,
                pt: false,
                pth: false,
                reason: '依赖未检测'
            };
        }

        if (!status.python) {
            return {
                npz: false,
                npy: false,
                pt: false,
                pth: false,
                reason: 'Python 未安装或路径配置错误'
            };
        }

        if (!status.numpy) {
            return {
                npz: false,
                npy: false,
                pt: false,
                pth: false,
                reason: 'NumPy 未安装'
            };
        }

        return {
            npz: true,
            npy: true,
            pt: status.torch,
            pth: status.torch,
            reason: status.torch ? undefined : 'PyTorch 未安装，.pt/.pth 文件不可用'
        };
    }
}
