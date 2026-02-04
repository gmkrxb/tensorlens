/**
 * 国际化（i18n）管理器
 * 支持中文和英文切换
 */
import * as vscode from 'vscode';

export type Language = 'zh-cn' | 'en';

interface Translations {
    [key: string]: string | Translations;
}

export class I18nManager {
    private static instance: I18nManager;
    private currentLanguage: Language;
    private translations: Map<Language, Translations> = new Map();
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // 从配置或缓存中读取语言设置
        const savedLang = context.globalState.get<Language>('tensorLens.language');
        const configLang = vscode.workspace.getConfiguration('tensorLens').get<Language>('language');
        
        // 优先级：配置 > 缓存 > 系统语言 > 默认中文
        this.currentLanguage = configLang || savedLang || this.detectSystemLanguage();
    }

    static getInstance(context?: vscode.ExtensionContext): I18nManager {
        if (!I18nManager.instance && context) {
            I18nManager.instance = new I18nManager(context);
        }
        return I18nManager.instance;
    }

    /**
     * 检测系统语言
     */
    private detectSystemLanguage(): Language {
        const locale = vscode.env.language.toLowerCase();
        return locale.startsWith('zh') ? 'zh-cn' : 'en';
    }

    /**
     * 注册翻译
     */
    registerTranslations(lang: Language, translations: Translations): void {
        this.translations.set(lang, translations);
    }

    /**
     * 获取当前语言
     */
    getCurrentLanguage(): Language {
        return this.currentLanguage;
    }

    /**
     * 切换语言
     */
    async setLanguage(lang: Language): Promise<void> {
        this.currentLanguage = lang;
        
        // 保存到全局状态
        await this.context.globalState.update('tensorLens.language', lang);
        
        // 同步更新配置
        const config = vscode.workspace.getConfiguration('tensorLens');
        await config.update('language', lang, vscode.ConfigurationTarget.Global);
        
        // 通知用户重新加载
        const reload = await vscode.window.showInformationMessage(
            this.t('common.reloadRequired'),
            this.t('common.reload'),
            this.t('common.cancel')
        );
        
        if (reload === this.t('common.reload')) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }

    /**
     * 翻译文本
     */
    t(key: string, ...args: Array<string | number>): string {
        const translations = this.translations.get(this.currentLanguage);
        if (!translations) {
            return key;
        }

        // 支持嵌套键：common.ok
        const keys = key.split('.');
        let value: unknown = translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = (value as Record<string, unknown>)[k];
            } else {
                return key;
            }
        }

        if (typeof value === 'string') {
            // 支持参数替换：{0}, {1}
            return value.replace(/\{(\d+)\}/g, (match, index) => {
                return args[index] !== undefined ? String(args[index]) : match;
            });
        }

        return key;
    }
}
