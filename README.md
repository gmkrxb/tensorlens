# TensorLens - Tensor & Archive Preview

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode" alt="VS Code Extension">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/Version-0.1.0-orange" alt="Version">
  <img src="https://img.shields.io/badge/Language-中文%20%7C%20English-red" alt="Language">
</p>

<p align="center">
  <b>一款功能强大的 VS Code 插件，用于预览和分析张量文件与压缩包</b><br>
  <i>A powerful VS Code extension for previewing and analyzing tensor files and archives</i>
</p>

<p align="center">
  支持 NumPy (.npz, .npy) | PyTorch (.pt, .pth) | ZIP | RAR | 7Z
</p>

---

## 📸 界面预览 / Interface Preview

<p align="center">
  <img src="images/img1.png" alt="TensorLens 界面预览" width="90%">
</p>

<p align="center">
  <i>TensorLens 主界面 - 支持多维张量导航、数据编辑、绘图和搜索功能</i><br>
  <i>TensorLens Main Interface - Multi-dimensional tensor navigation, data editing, plotting and search</i>
</p>

---

## 🌏 语言 / Language

本插件支持中英文双语界面！
This extension supports bilingual interface (Chinese & English)!

**切换语言 / Switch Language:**
1. 按下 `Ctrl+Shift+P` / Press `Ctrl+Shift+P`
2. 输入 "Switch Language" / Type "Switch Language"
3. 选择你的语言 / Select your language

或在设置中配置 `tensorLens.language`
Or configure `tensorLens.language` in settings

**其他语言版本 / Read this in other languages:**
- [中文文档](README.md)
- [English](README_en.md)

---

## ✨ 功能特性

### 🔢 张量文件预览
- **多格式支持**: NumPy (`.npz`, `.npy`) 和 PyTorch (`.pt`, `.pth`)
- **数据表格**: 表格形式展示张量数据，支持切片操作
- **统计分析**: 形状、数据类型、最大/最小值、均值、标准差
- **可视化图表**: 
  - 📈 折线图、柱状图、散点图
  - 🔥 热力图、直方图
  - 🖼️ 图像可视化
- **高级搜索**: 正则表达式、区分大小写
- **数据导出**: CSV、JSON、NPY、PNG、TXT

### 📦 压缩文件预览
- **多格式支持**: ZIP、RAR、7Z、TAR、GZ
- **文件树浏览**: 直观的目录结构展示
- **在线预览**: 
  - 代码语法高亮
  - 图片即时预览
  - 二进制 HEX 显示
- **一键解压**: 多种解压路径选项

## 📦 安装

### VS Code 扩展市场
1. 打开 VS Code → `Ctrl+Shift+X`
2. 搜索 "TensorLens"
3. 点击安装

### 手动安装
```bash
code --install-extension tensorlens-0.1.0.vsix
```

## 🔧 依赖

| 依赖 | 用途 | 必需 |
|------|------|------|
| Python 3.7+ | 运行环境 | ✅ |
| NumPy | 读取 .npz/.npy | ✅ |
| PyTorch | 读取 .pt/.pth | ⭕ 可选 |
| 7-Zip | RAR/7Z 解压 | ⭕ 可选 |

### Python环境管理

TensorLens会在首次启动时自动检测Python环境：

- **未安装Python**: 提示安装Python 3.7+
- **已安装Python**: 询问是否创建专用虚拟环境
  - **推荐**: 创建虚拟环境（避免依赖冲突）
  - **可选**: 使用系统Python环境

#### 手动创建虚拟环境
```bash
# TensorLens会在工作区创建 .tensorlens-venv
# 也可以手动运行命令：TensorLens: 创建Python虚拟环境
```

#### 安装依赖
```bash
pip install numpy torch
```

## 🚀 快速开始

### 开发环境搭建

从GitHub克隆和安装：

```bash
# 1. 克隆项目到本地
git clone https://github.com/gmkrxb/tensorlens.git

# 2. 进入项目目录  
cd tensorlens

# 3. 安装项目依赖（下载node_modules）
npm install
```

### NPM 脚本命令

| 命令 | 说明 | 用途 |
|------|------|------|
| `npm run compile` | 编译 TypeScript 代码 | 将 src/ 下的 .ts 文件编译为 JavaScript |
| `npm run watch` | 监视模式编译 | 文件修改时自动重新编译（开发时使用） |
| `npm run lint` | 代码质量检查 | 使用 ESLint 检查代码规范 |
| `npm test` | 运行测试 | 执行扩展测试套件 |
| `npm run package` | 打包扩展 | 生成 .vsix 安装包文件 |
| `npm run install-extension` | 安装扩展 | 将打包的扩展安装到 VS Code |
| `npm run vscode:prepublish` | 发布前准备 | 自动编译（打包时自动执行） |

### 完整开发流程

```bash
# 开发调试
npm run watch          # 启动监视模式，自动编译
# 按 F5 在 VS Code 中启动调试

# 代码检查
npm run lint           # 检查代码质量

# 打包安装
npm run package        # 打包为 .vsix 文件
npm run install-extension  # 安装到 VS Code
```

### 使用步骤

1. **张量文件**: 双击 `.npz`/`.pt` 文件自动打开预览
2. **压缩文件**: 双击 `.zip`/`.rar` 文件浏览内容
3. **绘图**: 选择张量 → 选择图表类型 → 点击"绘图"
4. **解压**: 右键文件/目录 → 选择解压选项
5. **语言切换**: `Ctrl+Shift+P` → "Switch Language"

### 命令面板指令

按下 `Ctrl+Shift+P` (或 `F1`) 打开命令面板，输入以下命令：

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `TensorLens: 打开张量文件预览` | 打开并预览张量文件 | 手动选择 .npz/.npy/.pt/.pth 文件 |
| `TensorLens: 预览压缩文件内容` | 浏览压缩包内容 | 查看 .zip/.rar/.7z 文件内部结构 |
| `TensorLens: 解压压缩文件` | 解压缩文件到指定目录 | 提取压缩包内容到本地 |
| `TensorLens: 检查依赖状态` | 检查 Python/NumPy/PyTorch/7-Zip 状态 | 诊断环境问题 |
| `TensorLens: 安装Python依赖` | 安装 NumPy 或 PyTorch | 补充缺失的 Python 包 |
| `TensorLens: 创建Python虚拟环境` | 为项目创建独立虚拟环境 | 隔离项目依赖 |
| `TensorLens: 切换语言` | 切换中文/英文界面 | 更改界面语言 |

## ⚙️ 配置

```json
{
  "tensorLens.pythonPath": "python",
  "tensorLens.maxPreviewSize": 10000,
  "tensorLens.defaultChartType": "line",
  "tensorLens.language": "zh-cn"
}
```

## 📁 项目结构

```
tensorlens/
├── src/                          # 源代码目录
│   ├── extension.ts             # 插件入口
│   ├── locales/                 # 国际化翻译
│   │   ├── zh-cn/              # 中文翻译模块
│   │   │   ├── index.ts        # 导出入口
│   │   │   ├── common.ts       # 通用文本
│   │   │   ├── dependency.ts   # 依赖管理
│   │   │   ├── commands.ts     # 命令
│   │   │   ├── language.ts     # 语言设置
│   │   │   ├── editor.ts       # 编辑器
│   │   │   └── config.ts       # 配置
│   │   └── en/                 # 英文翻译模块
│   │       └── ...             # 同上结构
│   ├── services/               # 业务服务
│   │   ├── dependencyChecker.ts  # 依赖检测
│   │   ├── tensorService.ts      # 张量处理
│   │   └── archiveService.ts     # 压缩文件处理
│   ├── editors/                # 自定义编辑器
│   │   ├── tensorEditor.ts     # 张量编辑器
│   │   └── archiveEditor.ts    # 压缩文件编辑器
│   ├── commands/               # 命令处理
│   │   ├── index.ts
│   │   ├── tensorCommands.ts
│   │   └── archiveCommands.ts
│   ├── utils/                  # 工具函数
│   │   ├── i18n.ts            # 国际化管理器
│   │   └── index.ts
│   ├── types/                  # 类型定义
│   │   └── index.ts
│   └── webview/                # WebView管理
│       └── webviewManager.ts
├── media/                       # 静态资源
│   ├── templates/              # HTML模板
│   │   ├── tensorViewer.html
│   │   └── archiveViewer.html
│   ├── tensorViewer.js         # 张量查看器前端
│   ├── archiveViewer.js        # 压缩文件查看器前端
│   ├── icons.js                # SVG图标
│   └── style.css               # 样式文件
├── scripts/                     # 辅助脚本
│   ├── tensor_handler.py       # Python张量处理器
│   └── github_push.py          # Git推送脚本（本地）
├── package.json                 # 插件配置
├── tsconfig.json               # TypeScript配置
├── README.md                    # 中文文档
├── README_en.md                 # 英文文档
└── LICENSE                      # MIT许可证
```

## 🛠️ 开发

### 快速开始

```bash
git clone https://github.com/gmkrxb/tensorlens.git
cd tensorlens
npm install
npm run compile
```

### 可用脚本命令

#### `npm run compile`
编译 TypeScript 代码到 JavaScript。
- 使用 `tsc` 编译器
- 输出目录：`./dist`
- 在发布前需要运行

#### `npm run watch`
以监视模式运行 TypeScript 编译器。
- 文件修改时自动重新编译
- 适用于开发阶段
- 使用 `tsc -watch`

#### `npm run lint`
运行 ESLint 检查代码质量。
- 检查 `src` 目录下的 TypeScript 文件
- 遵循项目代码规范
- 可自动修复部分问题（添加 `--fix` 参数）

#### `npm test`
运行扩展测试套件。
- 执行 `./out/test/runTest.js`
- 确保功能正常运行

#### `npm run vscode:prepublish`
发布前的准备脚本。
- 自动运行 `npm run compile`
- 在打包扩展时自动执行

#### `npm run package`
打包扩展为 .vsix 文件。
- 自动从 package.json 读取版本号
- 生成 `tensorlens-{version}.vsix` 文件
- 相当于 `npx vsce package`

#### `npm run install-extension`
安装当前打包的扩展到 VS Code。
- 自动使用 package.json 中的版本号
- 安装 `tensorlens-{version}.vsix` 文件
- 需要先运行 `npm run package` 生成 .vsix 文件

### 完整工作流

```bash
# 开发 → 打包 → 安装
npm run compile    # 编译代码
npm run package    # 打包扩展
npm run install-extension  # 安装到VS Code
```

### 打包扩展（旧方式）

```bash
npx vsce package
```

生成 `.vsix` 文件，可用于本地安装或发布到市场。

## 📝 更新日志

### v0.1.0 (2026年2月4日 / Feb 4, 2026)

🎉 **初代版本发布！首个功能完整的预览版本** / **First Generation Release! First Feature-Complete Preview**

#### ✨ 核心功能 / Core Features

**张量文件预览 / Tensor File Preview:**
- ✅ 支持 NumPy (`.npz`, `.npy`) 和 PyTorch (`.pt`, `.pth`) 格式
- ✅ 多维数组树形导航系统（支持N维张量逐层浏览）
- ✅ 表格式数据展示，支持手动切片输入
- ✅ 数据编辑与保存功能（完整的dtype验证）
- ✅ 统计信息：形状、数据类型、最大/最小值、均值、标准差
- ✅ 搜索功能：支持键名和数据值搜索
- ✅ 绘图功能：折线图、柱状图、散点图、热力图、直方图
- ✅ 图表类型实时切换
- ✅ 数据导出：CSV、JSON、NPY格式

**压缩文件预览 / Archive File Preview:**
- ✅ 支持 ZIP、RAR、7Z、TAR、GZ 格式
- ✅ 文件树浏览器（层级目录结构）
- ✅ 在线预览：代码语法高亮、图片即时预览、二进制HEX显示
- ✅ 一键解压缩功能

**环境管理 / Environment Management:**
- ✅ 自动检测 Python、NumPy、PyTorch、7-Zip 依赖
- ✅ Python 版本检测（通过 Python Extension API）
- ✅ 动态依赖状态更新
- ✅ 友好的错误提示和格式示例

**用户界面 / User Interface:**
- ✅ SVG 图标系统（替代 emoji）
- ✅ 中英文双语支持
- ✅ UTF-8 编码全路径支持
- ✅ 详细的操作日志记录

#### 🐛 已知问题 / Known Issues

1. **图表切换问题 / Chart Switching Issue**
   - 问题：所有图表类型直接切换时可能显示异常
   - 临时方案：需要先打开绘图参数设置面板，再切换图表类型才能正常显示
   - 状态：待修复

2. **搜索功能失效 / Search Function Failure**
   - 问题：搜索操作时出现搜索失败或检索不到结果的情况，整体搜索功能不稳定
   - 影响：无法正常搜索张量键名和数据值
   - 状态：待修复

3. **导出按钮失效 / Export Button Disabled**
   - 问题：绘图界面右侧的导出按钮意义不明，点击无响应
   - 临时方案：使用图表工具栏的相机图标进行截图导出
   - 状态：待修复或移除

## 👤 作者

**Mark Gu** | [Blog](https://life.gumingke.cloud) | [Email](mailto:gmk@gumingke.cloud) | [IOMI Team](https://iomi.team)

## 📄 许可证

[MIT License](LICENSE) © 2024 Mark Gu & IOMI Team

---

<p align="center">
  Made with ❤️ by <a href="https://iomi.team">IOMI Team</a>
</p>
