/**
 * 张量文件处理服务
 * 通过Python脚本处理张量文件
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { TensorData, TensorInfo, SearchResult, PlotData } from '../types';
import { DependencyChecker } from './dependencyChecker';

export class TensorService {
    private scriptPath: string;
    private checker: DependencyChecker;

    constructor(private context: vscode.ExtensionContext) {
        this.scriptPath = path.join(context.extensionPath, 'scripts', 'tensor_handler.py');
        this.checker = DependencyChecker.getInstance();
    }

    private async getPythonPath(): Promise<string> {
        return this.checker.getPythonPath();
    }

    /**
     * 加载张量文件
     */
    async loadTensor(filePath: string): Promise<TensorData> {
        return this.runPythonScript('load', { file: filePath });
    }

    /**
     * 搜索张量数据
     */
    async search(
        filePath: string,
        query: string,
        options: { regex: boolean; caseSensitive: boolean }
    ): Promise<SearchResult[]> {
        return this.runPythonScript('search', {
            file: filePath,
            query: query,
            regex: options.regex,
            caseSensitive: options.caseSensitive
        });
    }

    /**
     * 筛选张量数据
     */
    async filter(
        filePath: string,
        filter: { key?: string; shape?: number[]; dtype?: string }
    ): Promise<TensorData> {
        return this.runPythonScript('filter', {
            file: filePath,
            ...filter
        });
    }

    /**
     * 准备绑图数据
     */
    async preparePlotData(
        filePath: string,
        plotConfig: { type: string; keys: string[]; options: Record<string, unknown> }
    ): Promise<PlotData> {
        return this.runPythonScript('plot', {
            file: filePath,
            ...plotConfig
        });
    }

    /**
     * 导出数据
     */
    async exportData(filePath: string, key: string, format: string): Promise<void> {
        const saveUri = await vscode.window.showSaveDialog({
            filters: this.getExportFilters(format),
            defaultUri: vscode.Uri.file(
                filePath.replace(/\.(npz|npy|pt|pth)$/, `_${key}.${format}`)
            )
        });

        if (!saveUri) {
            return;
        }

        await this.runPythonScript('export', {
            file: filePath,
            key: key,
            format: format,
            output: saveUri.fsPath
        });
    }

    /**
     * 获取张量信息（不加载完整数据）
     */
    async getTensorInfo(filePath: string): Promise<TensorInfo[]> {
        return this.runPythonScript('info', { file: filePath });
    }

    /**
     * 获取张量切片
     */
    async getSlice(
        filePath: string,
        key: string,
        sliceSpec: string
    ): Promise<unknown> {
        return this.runPythonScript('slice', {
            file: filePath,
            key: key,
            slice: sliceSpec
        });
    }

    /**
     * 保存编辑的单元格
     */
    async saveEdits(
        filePath: string,
        key: string,
        changes: Array<{ row: number; col: number; value: string }>
    ): Promise<any> {
        return await this.runPythonScript('save', {
            file: filePath,
            key: key,
            changes: changes
        });
    }

    private getExportFilters(format: string): { [name: string]: string[] } {
        const filters: { [name: string]: { [name: string]: string[] } } = {
            csv: { 'CSV': ['csv'] },
            json: { 'JSON': ['json'] },
            npy: { 'NumPy': ['npy'] },
            png: { 'PNG': ['png'] },
            txt: { 'Text': ['txt'] }
        };
        return filters[format] || { 'All': ['*'] };
    }

    private async runPythonScript<T>(command: string, args: object): Promise<T> {
        const pythonPath = await this.getPythonPath();
        const argsStr = JSON.stringify(args);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logDir = path.join(this.context.extensionPath, 'logs');
        const logFile = path.join(logDir, `python_${command}_${timestamp}.log`);
        
        // 确保日志目录存在
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        console.log(`执行Python脚本: ${pythonPath} ${this.scriptPath} ${command} ${argsStr.substring(0, 100)}`);
        console.log(`日志文件: ${logFile}`);
        
        // 写入日志文件头部
        const logHeader = `=== Python脚本执行日志 ===
时间: ${new Date().toISOString()}
命令: ${command}
参数: ${argsStr}
Python路径: ${pythonPath}
脚本路径: ${this.scriptPath}

=== 输出 ===
`;
        fs.writeFileSync(logFile, logHeader, 'utf8');
        
        return new Promise((resolve, reject) => {
            const proc = spawn(pythonPath, [
                this.scriptPath,
                command,
                argsStr
            ], {
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8'  // 强制 Python 使用 UTF-8 输出
                }
            });

            let stdout = '';
            let stderr = '';

            // 设置编码为 UTF-8
            proc.stdout.setEncoding('utf8');
            proc.stderr.setEncoding('utf8');

            proc.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                // 追加到日志文件
                fs.appendFileSync(logFile, text, 'utf8');
            });

            proc.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                // 追加到日志文件
                fs.appendFileSync(logFile, `[STDERR] ${text}`, 'utf8');
            });

            proc.on('close', (code) => {
                // 写入日志文件尾部
                const logFooter = `\n=== 执行完成 ===
退出码: ${code}
STDOUT长度: ${stdout.length} 字节
STDERR长度: ${stderr.length} 字节
`;
                fs.appendFileSync(logFile, logFooter, 'utf8');
                
                console.log(`Python脚本执行完成，日志已保存: ${logFile}`);
                
                // 先尝试解析 stdout
                if (stdout.trim()) {
                    try {
                        const result = JSON.parse(stdout);
                        // 如果有 error 字段，返回该对象（而不是 reject）
                        if (result && typeof result === 'object' && 'error' in result) {
                            console.log('检测到 Python 返回的错误信息:', result.error);
                            resolve(result as T);
                            return;
                        }
                        // 正常的成功响应
                        if (code === 0) {
                            resolve(result);
                            return;
                        }
                    } catch (parseErr) {
                        // JSON 解析失败
                        if (code === 0) {
                            const error = `解析Python输出失败: ${stdout.substring(0, 200)}... (完整输出见日志文件)`;
                            console.error(error);
                            reject(new Error(error));
                            return;
                        }
                    }
                }
                
                // 如果运行到这里，说明退出码不为0且没有有效的 JSON 输出
                const error = `Python脚本退出码: ${code}, 错误: ${stderr.substring(0, 200)}... (完整输出见日志文件)`;
                console.error(error);
                reject(new Error(error));
            });

            proc.on('error', (error) => {
                fs.appendFileSync(logFile, `\n[ERROR] ${error.message}`, 'utf8');
                reject(new Error(`启动Python失败: ${error.message}`));
            });
        });
    }
}
