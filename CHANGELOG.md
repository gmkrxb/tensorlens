# Change Log / 更新日志

All notable changes to the "TensorLens" extension will be documented in this file.  
本扩展的所有重要更改都将记录在此文件中。

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.  
查看 [Keep a Changelog](http://keepachangelog.com/) 了解如何组织此文件的建议。

---

## [0.1.0] - 2026-02-04

🎉 **Initial Release - First Generation Version!**  
🎉 **初代版本发布！首个功能完整的预览版本！**

### ✨ Added / 新增功能

#### Tensor File Preview / 张量文件预览
- ✅ Support for NumPy (`.npz`, `.npy`) and PyTorch (`.pt`, `.pth`) formats  
  支持 NumPy 和 PyTorch 格式
- ✅ Multi-dimensional array tree navigation system (supports N-dimensional tensor layer-by-layer browsing)  
  多维数组树形导航系统（支持N维张量逐层浏览）
- ✅ Table-style data display with manual slice input  
  表格式数据展示，支持手动切片输入
- ✅ Data editing and saving functionality (complete dtype validation)  
  数据编辑与保存功能（完整的dtype验证）
- ✅ Statistical information: shape, data type, max/min values, mean, standard deviation  
  统计信息：形状、数据类型、最大/最小值、均值、标准差
- ✅ Search functionality: supports key name and data value search  
  搜索功能：支持键名和数据值搜索
- ✅ Plotting functionality: line, bar, scatter, heatmap, histogram charts  
  绘图功能：折线图、柱状图、散点图、热力图、直方图
- ✅ Real-time chart type switching  
  图表类型实时切换
- ✅ Data export: CSV, JSON, NPY formats  
  数据导出：CSV、JSON、NPY格式

#### Archive File Preview / 压缩文件预览
- ✅ Support for ZIP, RAR, 7Z, TAR, GZ formats  
  支持 ZIP、RAR、7Z、TAR、GZ 格式
- ✅ File tree browser (hierarchical directory structure)  
  文件树浏览器（层级目录结构）
- ✅ Online preview: code syntax highlighting, instant image preview, binary HEX display  
  在线预览：代码语法高亮、图片即时预览、二进制HEX显示
- ✅ One-click extraction functionality  
  一键解压缩功能

#### Environment Management / 环境管理
- ✅ Automatic detection of Python, NumPy, PyTorch, 7-Zip dependencies  
  自动检测 Python、NumPy、PyTorch、7-Zip 依赖
- ✅ Python version detection (via Python Extension API)  
  Python 版本检测（通过 Python Extension API）
- ✅ Dynamic dependency status updates  
  动态依赖状态更新
- ✅ Friendly error messages with format examples  
  友好的错误提示和格式示例

#### User Interface / 用户界面
- ✅ SVG icon system (replacing emoji)  
  SVG 图标系统（替代 emoji）
- ✅ Bilingual support (Chinese & English)  
  中英文双语支持
- ✅ UTF-8 encoding support throughout  
  UTF-8 编码全路径支持
- ✅ Detailed operation logging  
  详细的操作日志记录

### 🐛 Known Issues / 已知问题

#### 1. Chart Switching Issue / 图表切换问题
- **Problem / 问题:**  
  When directly switching between all chart types, the display may be abnormal.  
  所有图表类型直接切换时可能显示异常。
  
- **Workaround / 临时方案:**  
  Need to open the plot parameter settings panel first, then switch chart types for normal display.  
  需要先打开绘图参数设置面板，再切换图表类型才能正常显示。
  
- **Status / 状态:** To be fixed / 待修复

#### 2. Search Function Failure / 搜索功能失效
- **Problem / 问题:**  
  Search operations may fail or return no results. Overall search functionality is unstable.  
  搜索操作时出现搜索失败或检索不到结果的情况，整体搜索功能不稳定。
  
- **Impact / 影响:**  
  Unable to normally search tensor key names and data values.  
  无法正常搜索张量键名和数据值。
  
- **Status / 状态:** To be fixed / 待修复

#### 3. Export Button Disabled / 导出按钮失效
- **Problem / 问题:**  
  The export button on the right side of the plotting interface has unclear purpose and doesn't respond to clicks.  
  绘图界面右侧的导出按钮意义不明，点击无响应。
  
- **Workaround / 临时方案:**  
  Use the camera icon in the chart toolbar for screenshot export.  
  使用图表工具栏的相机图标进行截图导出。
  
- **Status / 状态:** To be fixed or removed / 待修复或移除

---

## Release Notes / 发布说明

### v0.1.0 Highlights / v0.1.0 亮点

This is the **first feature-complete version** of TensorLens! 🎊  
这是 TensorLens 的**首个功能完整版本**！🎊

**What's Working Great / 运行良好的功能:**
- 🌟 Multi-dimensional tensor navigation with tree-based UI  
  基于树形UI的多维张量导航
- 🌟 Full data editing with type validation and range checking  
  完整的数据编辑（带类型验证和范围检查）
- 🌟 Interactive plotting with Plotly.js  
  基于 Plotly.js 的交互式绘图
- 🌟 Comprehensive error messages with detailed format examples  
  详尽的错误信息和格式示例

**What Needs Polish / 需要优化的功能:**
- 🔧 Chart type switching UX  
  图表类型切换用户体验
- 🔧 Search stability  
  搜索稳定性
- 🔧 Export button functionality  
  导出按钮功能

### Development Timeline / 开发时间线

- **2026-01-XX:** Project initialization / 项目初始化
- **2026-01-XX:** Basic tensor preview / 基础张量预览
- **2026-01-XX:** Archive viewer / 压缩包查看器
- **2026-01-XX:** Plotting functionality / 绘图功能
- **2026-01-XX:** Tree-based navigation redesign / 树形导航重设计
- **2026-02-04:** v0.1.0 Release / v0.1.0 发布

---

### Future Plans / 未来计划

- [ ] Fix chart switching issue / 修复图表切换问题
- [ ] Improve search stability / 改进搜索稳定性
- [ ] Clarify or fix export button / 明确或修复导出按钮
- [ ] Add more chart types / 添加更多图表类型
- [ ] Performance optimization for large tensors / 大型张量性能优化
- [ ] Add filter functionality / 添加过滤功能
- [ ] Support more tensor formats / 支持更多张量格式

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

本格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，  
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/spec/v2.0.0.html) 规范。
