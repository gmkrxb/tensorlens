/**
 * 压缩文件处理服务
 */
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
// @ts-ignore
import Seven from 'node-7z';
import { ArchiveEntry, FilePreview } from '../types';

export class ArchiveService {
    /**
     * 列出压缩包内容
     */
    async listEntries(archivePath: string): Promise<ArchiveEntry[]> {
        const ext = path.extname(archivePath).toLowerCase();

        switch (ext) {
            case '.zip':
                return this.listZipEntries(archivePath);
            case '.rar':
            case '.7z':
            case '.tar':
            case '.gz':
                return this.list7zEntries(archivePath);
            default:
                throw new Error(`不支持的压缩格式: ${ext}`);
        }
    }

    /**
     * 解压整个压缩包
     */
    async extract(archivePath: string, targetPath: string): Promise<void> {
        const ext = path.extname(archivePath).toLowerCase();

        switch (ext) {
            case '.zip':
                return this.extractZip(archivePath, targetPath);
            case '.rar':
            case '.7z':
            case '.tar':
            case '.gz':
                return this.extract7z(archivePath, targetPath);
            default:
                throw new Error(`不支持的压缩格式: ${ext}`);
        }
    }

    /**
     * 解压单个文件
     */
    async extractSingle(
        archivePath: string,
        entryPath: string,
        targetPath: string
    ): Promise<void> {
        const ext = path.extname(archivePath).toLowerCase();

        switch (ext) {
            case '.zip':
                return this.extractZipSingle(archivePath, entryPath, targetPath);
            case '.rar':
            case '.7z':
            case '.tar':
            case '.gz':
                return this.extract7zSingle(archivePath, entryPath, targetPath);
            default:
                throw new Error(`不支持的压缩格式: ${ext}`);
        }
    }

    /**
     * 读取压缩包内文件内容（用于预览）
     */
    async readFileContent(archivePath: string, entryPath: string): Promise<FilePreview> {
        const ext = path.extname(archivePath).toLowerCase();
        const fileExt = path.extname(entryPath).toLowerCase();

        let buffer: Buffer;

        if (ext === '.zip') {
            const zip = new AdmZip(archivePath);
            const entry = zip.getEntry(entryPath);
            if (!entry) {
                throw new Error(`文件不存在: ${entryPath}`);
            }
            buffer = entry.getData();
        } else if (['.rar', '.7z', '.tar', '.gz'].includes(ext)) {
            // 对于7z/rar/tar格式，先解压到临时目录再读取
            const tmpDir = path.join(require('os').tmpdir(), 'tensorlens-' + Date.now());
            if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            try {
                await this.extract7zSingle(archivePath, entryPath, tmpDir);
                const tmpFile = path.join(tmpDir, path.basename(entryPath));
                buffer = fs.readFileSync(tmpFile);
                
                // 清理临时文件
                fs.unlinkSync(tmpFile);
                fs.rmdirSync(tmpDir);
            } catch (error) {
                // 清理临时目录
                if (fs.existsSync(tmpDir)) {
                    try {
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    } catch {}
                }
                throw error;
            }
        } else {
            throw new Error('暂不支持此格式的在线预览');
        }

        return this.parseFileContent(buffer, fileExt, entryPath);
    }

    // ========== ZIP格式处理 ==========

    private listZipEntries(archivePath: string): ArchiveEntry[] {
        const zip = new AdmZip(archivePath);
        const entries = zip.getEntries();

        return entries.map(entry => ({
            name: entry.name,
            path: entry.entryName,
            isDirectory: entry.isDirectory,
            size: entry.header.size,
            compressedSize: entry.header.compressedSize,
            modifiedTime: entry.header.time
        }));
    }

    private extractZip(archivePath: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const zip = new AdmZip(archivePath);
                zip.extractAllTo(targetPath, true);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    private extractZipSingle(
        archivePath: string,
        entryPath: string,
        targetPath: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const zip = new AdmZip(archivePath);
                const entry = zip.getEntry(entryPath);
                if (!entry) {
                    reject(new Error(`文件不存在: ${entryPath}`));
                    return;
                }
                zip.extractEntryTo(entry, targetPath, false, true);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // ========== 7z/RAR等格式处理 ==========

    private async list7zEntries(archivePath: string): Promise<ArchiveEntry[]> {
        return new Promise((resolve, reject) => {
            const entries: ArchiveEntry[] = [];
            const sevenZip = Seven.list(archivePath, {
                $bin: this.get7zPath()
            });

            sevenZip.on('data', (data: any) => {
                if (data.file) {
                    entries.push({
                        path: data.file,
                        name: path.basename(data.file),
                        size: parseInt(data.size) || 0,
                        compressedSize: parseInt(data.compressed) || 0,
                        isDirectory: data.attr?.startsWith('D') || false,
                        modifiedTime: data.dateTime ? new Date(data.dateTime) : undefined
                    });
                }
            });

            sevenZip.on('end', () => resolve(entries));
            sevenZip.on('error', (err: Error) => reject(err));
        });
    }

    private async extract7z(archivePath: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const sevenZip = Seven.extractFull(archivePath, targetPath, {
                $bin: this.get7zPath(),
                $progress: true
            });

            sevenZip.on('end', () => resolve());
            sevenZip.on('error', (err: Error) => reject(err));
        });
    }

    private async extract7zSingle(
        archivePath: string,
        entryPath: string,
        targetPath: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const sevenZip = Seven.extractFull(archivePath, targetPath, {
                $bin: this.get7zPath(),
                $progress: true,
                recursive: false,
                files: [entryPath]
            });

            sevenZip.on('end', () => resolve());
            sevenZip.on('error', (err: Error) => reject(err));
        });
    }

    /**
     * 获取7z可执行文件路径
     */
    private get7zPath(): string {
        // Windows: 尝试默认安装路径
        if (process.platform === 'win32') {
            const possiblePaths = [
                'C:\\Program Files\\7-Zip\\7z.exe',
                'C:\\Program Files (x86)\\7-Zip\\7z.exe',
                '7z.exe' // 系统PATH中
            ];
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
            return '7z.exe';
        }
        // Linux/Mac: 使用命令行工具
        return process.platform === 'darwin' ? '7z' : '7za';
    }

    // ========== 文件内容解析 ==========

    private parseFileContent(buffer: Buffer, ext: string, filePath: string): FilePreview {
        const textExtensions = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.ini', '.cfg', '.log'];
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];

        if (textExtensions.includes(ext)) {
            return {
                type: 'text',
                content: buffer.toString('utf-8'),
                path: filePath,
                language: this.getLanguage(ext)
            };
        }

        if (imageExtensions.includes(ext)) {
            const base64 = buffer.toString('base64');
            const mimeType = this.getMimeType(ext);
            return {
                type: 'image',
                content: `data:${mimeType};base64,${base64}`,
                path: filePath
            };
        }

        // 二进制文件，显示十六进制
        return {
            type: 'binary',
            content: this.formatHex(buffer.slice(0, 1024)),
            path: filePath,
            size: buffer.length
        };
    }

    private getLanguage(ext: string): string {
        const langMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.json': 'json',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.md': 'markdown',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };
        return langMap[ext] || 'plaintext';
    }

    private getMimeType(ext: string): string {
        const mimeMap: { [key: string]: string } = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml'
        };
        return mimeMap[ext] || 'application/octet-stream';
    }

    private formatHex(buffer: Buffer): string {
        const lines: string[] = [];
        for (let i = 0; i < buffer.length; i += 16) {
            const slice = buffer.slice(i, i + 16);
            const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
            const ascii = Array.from(slice).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
            lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(48)}  ${ascii}`);
        }
        return lines.join('\n');
    }
}
