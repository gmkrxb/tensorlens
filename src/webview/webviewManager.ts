/**
 * Webview管理器
 * 负责生成和管理预览面板的HTML
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyChecker } from '../services/dependencyChecker';

export class WebviewManager {
    private templateCache: Map<string, string> = new Map();

    constructor(private context: vscode.ExtensionContext) { }

    /**
     * 获取张量查看器HTML
     */
    async getTensorViewerHtml(webview: vscode.Webview, filePath: string): Promise<string> {
        const template = this.loadTemplate('tensorViewer.html');
        const nonce = this.getNonce();

        const checker = DependencyChecker.getInstance();
        // 确保获取最新的依赖状态
        const depStatus = await checker.checkAll().catch((err) => {
            console.error('检查依赖失败:', err);
            return {
                python: false,
                numpy: false,
                torch: false
            };
        });
        console.log('依赖检查结果:', depStatus);
        const featureAvail = checker.getFeatureAvailability();

        const variables: Record<string, string> = {
            cspSource: webview.cspSource,
            nonce: nonce,
            styleUri: this.getMediaUri(webview, 'style.css').toString(),
            iconsUri: this.getMediaUri(webview, 'icons.js').toString(),
            scriptUri: this.getMediaUri(webview, 'tensorViewer.js').toString(),
            fileName: path.basename(filePath),
            filePath: filePath,
            dependencyStatus: JSON.stringify(depStatus),
            featureAvailability: JSON.stringify(featureAvail)
        };

        return this.renderTemplate(template, variables);
    }

    /**
     * 获取压缩包查看器HTML
     */
    getArchiveViewerHtml(webview: vscode.Webview, filePath: string): string {
        const template = this.loadTemplate('archiveViewer.html');
        const nonce = this.getNonce();

        // 获取当前目录（文件所在目录）
        const currentDir = path.dirname(filePath);
        // 默认子文件夹名（去掉扩展名）
        const defaultSubfolder = path.basename(filePath).replace(/\.[^.]+$/, '');

        const variables: Record<string, string> = {
            cspSource: webview.cspSource,
            nonce: nonce,
            styleUri: this.getMediaUri(webview, 'style.css').toString(),
            iconsUri: this.getMediaUri(webview, 'icons.js').toString(),
            scriptUri: this.getMediaUri(webview, 'archiveViewer.js').toString(),
            fileName: path.basename(filePath),
            filePath: filePath,
            currentDir: currentDir,
            defaultSubfolder: defaultSubfolder
        };

        return this.renderTemplate(template, variables);
    }

    /**
     * 加载HTML模板
     */
    private loadTemplate(templateName: string): string {
        // 检查缓存
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName)!;
        }

        const templatePath = path.join(
            this.context.extensionPath,
            'media',
            'templates',
            templateName
        );

        try {
            const content = fs.readFileSync(templatePath, 'utf-8');
            this.templateCache.set(templateName, content);
            return content;
        } catch (error) {
            console.error(`Failed to load template: ${templateName}`, error);
            return this.getFallbackHtml(templateName);
        }
    }

    /**
     * 渲染模板（替换变量）
     */
    private renderTemplate(template: string, variables: Record<string, string>): string {
        let result = template;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value);
        }

        return result;
    }

    /**
     * 获取备用HTML（模板加载失败时）
     */
    private getFallbackHtml(templateName: string): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Error</title>
    <style>
        body { 
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .error {
            text-align: center;
            padding: 40px;
        }
        .error h2 { color: var(--vscode-errorForeground); }
    </style>
</head>
<body>
    <div class="error">
        <h2>模板加载失败</h2>
        <p>无法加载模板文件: ${templateName}</p>
        <p>请检查插件安装是否完整。</p>
    </div>
</body>
</html>`;
    }

    /**
     * 清除模板缓存
     */
    clearCache(): void {
        this.templateCache.clear();
    }

    /**
     * 获取媒体资源URI
     */
    private getMediaUri(webview: vscode.Webview, fileName: string): vscode.Uri {
        const mediaPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', fileName);
        return webview.asWebviewUri(mediaPath);
    }

    /**
     * 生成随机nonce
     */
    private getNonce(): string {
        let text = '';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return text;
    }
}
