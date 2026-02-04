/**
 * 张量查看器前端脚本
 * 支持表格交互、单元格编辑、撤销/重做、多参数绘图
 */
(function () {
    const vscode = acquireVsCodeApi();

    // 状态管理
    let state = {
        tensors: [],
        selectedKey: null,
        searchResults: null,
        editHistory: [], // 编辑历史
        historyIndex: -1, // 历史记录索引
        currentData: null, // 当前显示的数据
        selectedCells: new Set(), // 选中的单元格
        isResizing: false, // 是否正在调整列宽
        resizeColumn: null, // 正在调整的列
        columnWidths: {}, // 列宽度记录
        isSelecting: false, // 是否正在拖动选择
        selectionStart: null, // 选择起点
        selectionEnd: null, // 选择终点
        currentCell: null, // 当前活动单元格 {row, col}
        // 维度导航状态
        dimensionPath: [], // 当前的维度路径 [0, 1, 2]
        tensorShape: [], // 当前张量的完整形状
        currentDepth: 0, // 当前深度
        // 绘图状态
        plotParams: {
            chartType: 'line',
            xAxis: 0,
            yAxis: 1,
            showLegend: true,
            showGrid: true,
            colorScheme: 'Viridis'
        },
        currentPlotData: null  // 当前绘图数据
    };

    // DOM元素
    const elements = {
        tensorList: document.getElementById('tensorList'),
        dataTable: document.getElementById('dataTable'),
        plotContainer: document.getElementById('plotContainer'),
        infoPanel: document.getElementById('infoPanel'),
        searchInput: document.getElementById('searchInput'),
        filterInput: document.getElementById('filterInput'),
        sliceInput: document.getElementById('sliceInput'),
        chartType: document.getElementById('chartType'),
        statusText: document.getElementById('statusText'),
        tensorStats: document.getElementById('tensorStats'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        currentPath: document.getElementById('currentPath'),
        exportChartBtn: document.getElementById('exportChartBtn')
    };

    // 初始化
    function init() {
        checkDependencies();
        bindEvents();
        showLoading(true);
    }

    // 检查依赖状态
    function checkDependencies() {
        const depStatus = window.dependencyStatus || {};
        const featureAvail = window.featureAvailability || {};

        console.log('检查依赖状态:', depStatus);
        console.log('功能可用性:', featureAvail);

        // 显示依赖状态
        const depStatusEl = document.getElementById('depStatus');
        if (depStatusEl) {
            if (depStatus.python && depStatus.numpy) {
                depStatusEl.innerHTML = depStatus.torch
                    ? `${Icons.success} 依赖完整`
                    : `${Icons.warning} PyTorch 未安装`;
            } else {
                depStatusEl.innerHTML = `${Icons.error} 依赖缺失`;
            }
        }

        // 如果功能不可用，显示提示
        if (featureAvail.reason && !featureAvail.npz) {
            showUnavailable(featureAvail.reason);
        }

        // 依赖横幅
        const banner = document.getElementById('dependencyBanner');
        const bannerText = document.getElementById('bannerText');
        if (banner && bannerText && featureAvail.reason) {
            bannerText.textContent = featureAvail.reason;
            banner.style.display = 'flex';

            // 关闭按钮
            document.getElementById('closeBannerBtn')?.addEventListener('click', () => {
                banner.style.display = 'none';
            });

            // 安装按钮
            document.getElementById('installDepBtn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'installDependency' });
            });
        }

        // 检查依赖按钮
        document.getElementById('checkDepBtn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'checkDependencies' });
        });
    }

    // 显示功能不可用
    function showUnavailable(reason) {
        const overlay = document.getElementById('unavailableOverlay');
        const reasonEl = document.getElementById('unavailableReason');

        if (overlay && reasonEl) {
            reasonEl.textContent = reason;
            overlay.style.display = 'flex';

            // 安装按钮
            document.getElementById('installBtn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'installDependency' });
            });

            // 配置按钮
            document.getElementById('configBtn')?.addEventListener('click', () => {
                vscode.postMessage({ command: 'openSettings' });
            });
        }
    }

    // 绑定事件
    function bindEvents() {
        // 搜索
        document.getElementById('searchBtn').addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });

        // 筛选
        elements.filterInput.addEventListener('input', handleFilter);

        // 刷新
        document.getElementById('refreshBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'refresh' });
        });

        // 绘图
        document.getElementById('plotBtn').addEventListener('click', handlePlot);
        
        // 图表类型切换 - 如果已有绘图数据，切换类型时重新绘制
        if (elements.chartType) {
            elements.chartType.addEventListener('change', () => {
                if (state.currentPlotData) {
                    state.plotParams.chartType = elements.chartType.value;
                    // 重新渲染图表
                    handlePlotData(state.currentPlotData);
                }
            });
        }
        
        // 导出图表按钮
        if (elements.exportChartBtn) {
            elements.exportChartBtn.addEventListener('click', handleExportChart);
        }

        // 导出
        document.getElementById('exportBtn').addEventListener('click', handleExport);

        // 切片
        document.getElementById('applySlice').addEventListener('click', handleSlice);

        // Tab切换
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
        });

        // 撤销/重做快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                    e.preventDefault();
                    redo();
                } else if (e.key === 's') {
                    e.preventDefault();
                    saveChanges();
                }
            }
        });

        // 表格事件委托
        elements.dataTable.addEventListener('dblclick', handleCellDoubleClick);
        elements.dataTable.addEventListener('mousedown', handleTableMouseDown);
        elements.dataTable.addEventListener('mousemove', handleTableMouseMove);
        elements.dataTable.addEventListener('mouseup', handleTableMouseUp);
    }

    // 处理来自插件的消息
    window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.type) {
            case 'tensorData':
                handleTensorData(message.data);
                break;
            case 'searchResults':
                handleSearchResults(message.data);
                break;
            case 'filteredData':
                handleFilteredData(message.data);
                break;
            case 'sliceData':
                handleSliceData(message.data);
                break;
            case 'plotData':
                handlePlotData(message.data);
                break;
            case 'saveResponse':
                handleSaveResponse(message);  // 直接传递整个消息对象
                break;
            case 'dependencyStatus':
                // 更新依赖状态
                window.dependencyStatus = message.data;
                checkDependencies();
                break;
            case 'error':
                showError(message.message);
                break;
        }
    });

    // 处理张量数据
    function handleTensorData(data) {
        showLoading(false);
        state.tensors = data.tensors;

        updateStatus(`已加载 ${data.tensors.length} 个张量`);
        elements.tensorStats.textContent = `总大小: ${formatSize(data.totalSize)}`;

        renderTensorList(data.tensors);

        if (data.tensors.length > 0) {
            selectTensor(data.tensors[0].key);
        }
    }

    // 处理切片数据
    function handleSliceData(data) {
        showLoading(false);
        
        // 检查是否有错误
        if (data && data.error) {
            showError(`切片失败：${data.error}`);
            return;
        }
        
        // 更新当前张量的预览数据
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (tensor) {
            tensor.preview = data;
            state.currentData = data;
            renderDataTable(tensor);
            updateStatus('切片加载完成');
        }
    }

    // 处理过滤数据（占位函数）
    function handleFilteredData(data) {
        showLoading(false);
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (tensor) {
            tensor.preview = data;
            state.currentData = data;
            renderDataTable(tensor);
        }
    }

    // 渲染张量列表 - 树形结构
    function renderTensorList(tensors) {
        if (state.currentDepth === 0) {
            // 顶层：显示所有张量
            elements.tensorList.innerHTML = tensors.map(t => {
                const isMultiDim = t.info.shape.length >= 3;
                const icon = isMultiDim 
                    ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"></path></svg>'
                    : '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75z"></path></svg>';
                return `
                    <div class="tensor-item ${state.selectedKey === t.key ? 'selected' : ''}" 
                         data-key="${t.key}">
                        <div class="tensor-name">
                            ${icon}${t.key}
                            ${isMultiDim ? ` <span style="font-size: 11px; color: var(--vscode-descriptionForeground);">(${t.info.shape.length}D)</span>` : ''}
                        </div>
                        <div class="tensor-meta">
                            <span class="shape">${t.info.shape.join(' × ')}</span>
                            <span class="dtype">${t.info.dtype}</span>
                        </div>
                    </div>
                `;
            }).join('');

            elements.tensorList.querySelectorAll('.tensor-item').forEach(item => {
                item.addEventListener('click', () => selectTensor(item.dataset.key));
            });
        } else {
            // 子层：显示当前维度的切片
            renderDimensionList();
        }
    }

    // 渲染维度切片列表
    function renderDimensionList() {
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (!tensor) return;

        // currentDepth 从 1 开始，所以 currentDepth-1 是当前要显示的维度索引
        const dimIndex = state.currentDepth - 1;
        if (dimIndex >= tensor.info.shape.length) {
            console.error('维度索引超出范围');
            return;
        }
        
        const currentDimSize = tensor.info.shape[dimIndex];
        const backIcon = '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.5 7.5a.5.5 0 0 0 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z"/></svg>';
        let html = `
            <div class="tensor-item" data-action="back" style="background: var(--vscode-list-hoverBackground);">
                <div class="tensor-name">${backIcon}返回上一层</div>
                <div class="tensor-meta">
                    <span style="font-size: 11px;">路径: [${state.dimensionPath.join('][')}]</span>
                </div>
            </div>
        `;

        // 判断下一层是否是叶子节点：当前路径长度 + 1 是否等于需要导航的层数
        const needNavigateLayers = tensor.info.shape.length - 2;
        const isNextLayerLeaf = (state.dimensionPath.length + 1) === needNavigateLayers;

        for (let i = 0; i < currentDimSize; i++) {
            const nextShape = tensor.info.shape.slice(state.currentDepth);
            const icon = isNextLayerLeaf 
                ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042z"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z"></path></svg>';
            html += `
                <div class="tensor-item" data-index="${i}">
                    <div class="tensor-name">
                        ${icon}[${i}]
                    </div>
                    <div class="tensor-meta">
                        <span class="shape">${nextShape.join(' × ')}</span>
                    </div>
                </div>
            `;
        }

        elements.tensorList.innerHTML = html;

        // 绑定返回按钮
        const backBtn = elements.tensorList.querySelector('[data-action="back"]');
        if (backBtn) {
            backBtn.addEventListener('click', navigateBack);
        }

        // 绑定切片点击
        elements.tensorList.querySelectorAll('[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                navigateInto(index);
            });
        });
    }

    // 导航进入子层
    function navigateInto(index) {
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (!tensor) return;

        state.dimensionPath.push(index);
        state.currentDepth++;

        console.log(`导航进入: depth=${state.currentDepth}, path=[${state.dimensionPath.join(',')}], shape=[${tensor.info.shape.join(',')}]`);

        // 对于 ND 数组，需要导航 N-2 层
        // 例如 5D 数组，需要导航 3 层，dimensionPath 长度为 3 时加载
        const needNavigateLayers = tensor.info.shape.length - 2;
        
        if (state.dimensionPath.length === needNavigateLayers) {
            // 到达最后一层，加载 2D 数据
            console.log(`到达最后一层，加载切片`);
            loadDimensionSlice();
        } else {
            // 继续显示下一层
            console.log(`继续导航，还需 ${needNavigateLayers - state.dimensionPath.length} 层`);
            renderDimensionList();
            updateCurrentPath();
        }
    }

    // 返回上一层
    function navigateBack() {
        if (state.currentDepth === 0) {
            console.log('已在根层，无法返回');
            return;
        }

        // 弹出最后一个索引
        const poppedIndex = state.dimensionPath.pop();
        state.currentDepth--;

        console.log(`返回上一层: depth=${state.currentDepth}, path=[${state.dimensionPath.join(',')}], popped=${poppedIndex}`);

        if (state.currentDepth === 0) {
            // 返回顶层，显示所有张量
            console.log('返回根层，显示张量列表');
            renderTensorList(state.tensors);
            updateCurrentPath();
        } else {
            // 返回上一个导航层
            console.log('返回导航层，显示维度列表');
            renderDimensionList();
            updateCurrentPath();
        }
    }

    // 更新当前路径显示
    function updateCurrentPath() {
        const pathEl = document.getElementById('currentPath');
        if (!pathEl) return;

        if (state.currentDepth === 0 || state.dimensionPath.length === 0) {
            pathEl.textContent = '';
        } else {
            const tensor = state.tensors.find(t => t.key === state.selectedKey);
            if (tensor) {
                const remainingShape = tensor.info.shape.slice(state.currentDepth);
                pathEl.textContent = `路径: [${state.dimensionPath.join('][')}] → ${remainingShape.join(' × ')}`;
            }
        }
    }

    // 选择张量
    function selectTensor(key) {
        state.selectedKey = key;
        state.dimensionPath = [];
        state.currentDepth = 0;

        elements.tensorList.querySelectorAll('.tensor-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.key === key);
        });

        const tensor = state.tensors.find(t => t.key === key);
        if (tensor) {
            state.tensorShape = tensor.info.shape;
            
            // 如果是3维及以上，进入导航模式
            if (tensor.info.shape.length >= 3) {
                state.currentDepth = 1;
                renderDimensionList();
                updateCurrentPath();
            } else {
                // 2维及以下直接显示
                renderDataTable(tensor);
            }
            
            renderInfoPanel(tensor);
        }
    }

    // 渲染数据表格
    function renderDataTable(tensor) {
        if (!tensor.preview || tensor.preview.length === 0) {
            elements.dataTable.innerHTML = '<tr><td class="empty">无预览数据</td></tr>';
            return;
        }

        const data = tensor.preview;
        state.currentData = data;
        let html = '<thead><tr>';

        // 表头 - 左上角显示当前单元格位置
        if (Array.isArray(data[0])) {
            const cellPos = state.currentCell ? getCellAddress(state.currentCell.row, state.currentCell.col) : '';
            html += `<th class="cell-position">${cellPos || '◻'}</th>`;
            for (let i = 0; i < Math.min(data[0].length, 20); i++) {
                html += `<th data-col="${i}">${getColumnName(i)}</th>`;
            }
            if (data[0].length > 20) {
                html += '<th>...</th>';
            }
        } else {
            html += '<th class="cell-position">◻</th><th>值</th>';
        }
        html += '</tr></thead><tbody>';

        // 数据行
        const maxRows = Math.min(data.length, 100);
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            html += `<td class="index">${i + 1}</td>`;

            if (Array.isArray(data[i])) {
                const maxCols = Math.min(data[i].length, 20);
                for (let j = 0; j < maxCols; j++) {
                    const cellId = `${i}-${j}`;
                    const isSelected = state.selectedCells.has(cellId);
                    const isCurrent = state.currentCell && state.currentCell.row === i && state.currentCell.col === j;
                    html += `<td data-row="${i}" data-col="${j}" class="${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}" title="${formatValue(data[i][j])}">${formatValue(data[i][j])}</td>`;
                }
                if (data[i].length > 20) {
                    html += '<td>...</td>';
                }
            } else {
                html += `<td data-row="${i}" data-col="0" title="${formatValue(data[i])}">${formatValue(data[i])}</td>`;
            }
            html += '</tr>';
        }

        if (data.length > 100) {
            html += `<tr><td colspan="100" class="more">... 还有 ${data.length - 100} 行</td></tr>`;
        }

        html += '</tbody>';
        elements.dataTable.innerHTML = html;

        // 恢复列宽
        applyColumnWidths();
    }

    /**
     * 获取列名 (A, B, C, ..., Z, AA, AB, ...)
     */
    function getColumnName(index) {
        let name = '';
        while (index >= 0) {
            name = String.fromCharCode(65 + (index % 26)) + name;
            index = Math.floor(index / 26) - 1;
        }
        return name;
    }

    /**
     * 获取单元格地址 (如 A1, B2, AA10)
     */
    function getCellAddress(row, col) {
        return getColumnName(col) + (row + 1);
    }

    /**
     * 应用已保存的列宽
     */
    function applyColumnWidths() {
        Object.keys(state.columnWidths).forEach(col => {
            const ths = elements.dataTable.querySelectorAll(`th[data-col="${col}"]`);
            const tds = elements.dataTable.querySelectorAll(`td[data-col="${col}"]`);
            const width = state.columnWidths[col] + 'px';
            ths.forEach(th => th.style.width = width);
            tds.forEach(td => td.style.width = width);
        });
    }



    // 加载指定维度的切片
    function loadDimensionSlice() {
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (!tensor) return;
        
        // 构建切片字符串 - 使用 dimensionPath + 两个冒号
        // 例如：5D 数组 [2,10,3,64,64]，dimensionPath=[0,1,2] 时
        // 切片应该是 "0,1,2,:,:" 共 5 个维度
        const sliceParts = [...state.dimensionPath, ':', ':'];
        const sliceStr = sliceParts.join(',');
        
        console.log(`加载切片: path=[${state.dimensionPath.join(',')}], slice="${sliceStr}", shape=[${tensor.info.shape.join(',')}]`);
        
        // 验证：sliceParts 的长度应该等于 shape 的长度
        if (sliceParts.length !== tensor.info.shape.length) {
            console.error(`切片维度不匹配: slice=${sliceParts.length}, shape=${tensor.info.shape.length}`);
            showError(`切片维度错误：预期 ${tensor.info.shape.length} 个维度，但构建了 ${sliceParts.length} 个`);
            return;
        }
        
        showLoading(true);
        updateStatus(`正在加载切片 [${state.dimensionPath.join('][')}]...`);
        
        // 请求切片数据
        vscode.postMessage({
            command: 'slice',
            key: state.selectedKey,
            slice: sliceStr
        });
    }

    // 渲染信息面板
    function renderInfoPanel(tensor) {
        const info = tensor.info;
        elements.infoPanel.innerHTML = `
            <div class="info-section">
                <h4>基本信息</h4>
                <div class="info-row"><span>键名:</span><span>${info.key}</span></div>
                <div class="info-row"><span>形状:</span><span>${info.shape.join(' × ')}</span></div>
                <div class="info-row"><span>数据类型:</span><span>${info.dtype}</span></div>
                <div class="info-row"><span>元素数量:</span><span>${info.size.toLocaleString()}</span></div>
            </div>
            ${info.min !== undefined ? `
            <div class="info-section">
                <h4>统计信息</h4>
                <div class="info-row"><span>最小值:</span><span>${formatValue(info.min)}</span></div>
                <div class="info-row"><span>最大值:</span><span>${formatValue(info.max)}</span></div>
                <div class="info-row"><span>均值:</span><span>${formatValue(info.mean)}</span></div>
                <div class="info-row"><span>标准差:</span><span>${formatValue(info.std)}</span></div>
            </div>
            ` : ''}
        `;
    }

    // 搜索处理
    function handleSearch() {
        const query = elements.searchInput.value.trim();
        if (!query) return;

        const regex = document.getElementById('regexCheck').checked;
        const caseSensitive = document.getElementById('caseCheck').checked;

        showLoading(true);
        vscode.postMessage({
            command: 'search',
            query: query,
            options: { regex, caseSensitive }
        });
    }

    // 处理搜索结果
    function handleSearchResults(results) {
        showLoading(false);
        state.searchResults = results;

        const total = results.reduce((sum, r) => sum + r.matches.length, 0);
        updateStatus(`找到 ${total} 个匹配`);

        // TODO: 高亮显示搜索结果
    }

    // 筛选处理
    function handleFilter() {
        const query = elements.filterInput.value.toLowerCase();

        elements.tensorList.querySelectorAll('.tensor-item').forEach(item => {
            const name = item.querySelector('.tensor-name').textContent.toLowerCase();
            item.style.display = name.includes(query) ? '' : 'none';
        });
    }

    // 绘图处理
    function handlePlot() {
        if (!state.selectedKey) {
            showError('请先选择一个张量');
            return;
        }

        // 显示绘图对话框
        const chartType = elements.chartType.value;
        showPlotDialog(chartType);
    }

    // 处理绘图数据
    function handlePlotData(plotData) {
        showLoading(false);
        switchTab('chart');
        
        // 保存当前绘图数据
        state.currentPlotData = plotData;

        // 使用state.plotParams.chartType而不是plotData.type，这样切换类型时会立即生效
        const chartType = state.plotParams.chartType;

        const traces = plotData.data.map(series => {
            const trace = {
                name: series.name,
                y: series.y
            };

            if (series.x) trace.x = series.x;
            if (series.z) trace.z = series.z;

            switch (chartType) {
                case 'bar':
                    trace.type = 'bar';
                    break;
                case 'scatter':
                    trace.type = 'scatter';
                    trace.mode = 'markers';
                    break;
                case 'heatmap':
                    trace.type = 'heatmap';
                    break;
                case 'histogram':
                    trace.type = 'histogram';
                    break;
                case 'box':
                    trace.type = 'box';
                    break;
                case 'image':
                    trace.type = 'heatmap';
                    trace.colorscale = 'Greys';
                    break;
                default:
                    trace.type = 'scatter';
                    trace.mode = 'lines';
            }

            return trace;
        });

        const layout = {
            title: plotData.title,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: 'var(--vscode-foreground)' },
            showlegend: state.plotParams.showLegend,
            xaxis: {
                showgrid: state.plotParams.showGrid,
                gridcolor: 'rgba(128, 128, 128, 0.2)'
            },
            yaxis: {
                showgrid: state.plotParams.showGrid,
                gridcolor: 'rgba(128, 128, 128, 0.2)'
            },
            ...plotData.layout
        };

        Plotly.newPlot(elements.plotContainer, traces, layout, { responsive: true });
    }

    // 导出处理
    function handleExport() {
        if (!state.selectedKey) {
            showError('请先选择一个张量');
            return;
        }

        // 显示导出格式选择
        const format = prompt('选择导出格式 (csv/json/npy/txt):', 'csv');
        if (!format) return;

        vscode.postMessage({
            command: 'export',
            format: format,
            key: state.selectedKey
        });
    }
    
    // 导出图表为图像
    function handleExportChart() {
        if (!state.currentPlotData) {
            showError('请先绘制图表');
            return;
        }
        
        // 检查 Plotly 是否加载
        if (typeof Plotly === 'undefined') {
            showError('Plotly 库未加载，无法导出图表');
            return;
        }
        
        showLoading(true);
        
        const filename = `chart_${state.selectedKey}_${new Date().getTime()}`;
        
        // 优先尝试使用 downloadImage（更可靠）
        if (Plotly.downloadImage) {
            try {
                Plotly.downloadImage(elements.plotContainer, {
                    format: 'png',
                    width: 1200,
                    height: 800,
                    filename: filename
                }).then(function() {
                    showLoading(false);
                    updateStatus('图表已导出');
                }).catch(function(err) {
                    showLoading(false);
                    const errorMsg = err && err.message ? err.message : (err ? String(err) : '未知错误');
                    showError('导出失败: ' + errorMsg);
                    console.error('导出图表失败:', err);
                });
            } catch (err) {
                showLoading(false);
                const errorMsg = err && err.message ? err.message : (err ? String(err) : '未知错误');
                showError('导出失败: ' + errorMsg);
                console.error('导出图表失败:', err);
            }
        } else if (Plotly.toImage) {
            // 备用方案：使用 toImage
            Plotly.toImage(elements.plotContainer, {
                format: 'png',
                width: 1200,
                height: 800
            }).then(function(dataUrl) {
                // 创建下载链接
                const link = document.createElement('a');
                link.download = filename + '.png';
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showLoading(false);
                updateStatus('图表已导出');
            }).catch(function(err) {
                showLoading(false);
                const errorMsg = err && err.message ? err.message : (err ? String(err) : '未知错误');
                showError('导出失败: ' + errorMsg);
                console.error('导出图表失败:', err);
            });
        } else {
            showLoading(false);
            showError('当前 Plotly 版本不支持导出功能');
        }
    }

    // 切片处理
    // 切片处理
    function handleSlice() {
        const slice = elements.sliceInput.value.trim();
        if (!slice) {
            showError('请输入切片表达式');
            return;
        }
        if (!state.selectedKey) {
            showError('请先选择一个张量');
            return;
        }

        showLoading(true);
        updateStatus(`正在应用切片 [${slice}]...`);
        
        vscode.postMessage({
            command: 'slice',
            key: state.selectedKey,
            slice: slice
        });
    }

    // Tab切换
    function switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === tabName + 'Tab');
        });
    }

    // 工具函数
    function formatValue(val) {
        if (val === null || val === undefined) return 'null';
        if (typeof val === 'number') {
            if (Number.isInteger(val)) return val.toString();
            return val.toFixed(6);
        }
        return String(val);
    }

    function formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(2)} ${units[i]}`;
    }

    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        showLoading(false);
        updateStatus(`错误: ${message}`);
        console.error(message);
    }

    function updateStatus(text) {
        elements.statusText.textContent = text;
    }

    // ========== 表格交互功能 ==========

    /**
     * 处理单元格双击 - 进入编辑模式或打开编辑对话框
     */
    function handleCellDoubleClick(e) {
        const cell = e.target.closest('td');
        if (!cell || cell.classList.contains('index') || !cell.dataset.row) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const originalValue = cell.textContent;

        // 检查单元格是否有省略号（文本被截断）
        if (cell.scrollWidth > cell.offsetWidth + 2) {
            // 打开编辑对话框
            showCellEditDialog(row, col, originalValue, (newValue) => {
                if (newValue !== originalValue) {
                    addToHistory({
                        type: 'edit',
                        cell: cell,
                        row: row + 1, // 表格行索引从0开始，但rowIndex从1开始（包含表头）
                        col: col + 1,
                        oldValue: originalValue,
                        newValue: newValue
                    });
                    cell.textContent = newValue;
                    cell.classList.add('edited');
                }
            });
        } else {
            // 内联编辑
            const input = document.createElement('input');
            input.type = 'text';
            input.value = originalValue;
            input.className = 'cell-editor';
            
            cell.textContent = '';
            cell.appendChild(input);
            input.focus();
            input.select();

            // 保存编辑
            const saveEdit = () => {
                const newValue = input.value;
                if (newValue !== originalValue) {
                    addToHistory({
                        type: 'edit',
                        cell: cell,
                        row: row + 1,
                        col: col + 1,
                        oldValue: originalValue,
                        newValue: newValue
                    });
                    cell.textContent = newValue;
                    cell.classList.add('edited');
                } else {
                    cell.textContent = originalValue;
                }
            };

            input.addEventListener('blur', saveEdit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveEdit();
                } else if (e.key === 'Escape') {
                    cell.textContent = originalValue;
                }
            });
        }
    }

    /**
     * 显示单元格编辑对话框
     */
    function showCellEditDialog(row, col, value, onSave) {
        const dialog = document.createElement('div');
        dialog.className = 'cell-edit-dialog';
        
        const cellAddress = getCellAddress(row, col);
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-header">
                    <span class="cell-position-label">编辑单元格 ${cellAddress}</span>
                    <button class="dialog-close">&times;</button>
                </div>
                <div class="dialog-body">
                    <textarea class="cell-edit-textarea">${value}</textarea>
                </div>
                <div class="dialog-footer">
                    <button class="btn-cancel">取消</button>
                    <button class="btn-save">保存 (Enter)</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        
        const textarea = dialog.querySelector('.cell-edit-textarea');
        const btnSave = dialog.querySelector('.btn-save');
        const btnCancel = dialog.querySelector('.btn-cancel');
        const btnClose = dialog.querySelector('.dialog-close');

        textarea.focus();
        textarea.select();

        const close = () => {
            dialog.remove();
        };

        const save = () => {
            onSave(textarea.value);
            close();
        };

        btnSave.addEventListener('click', save);
        btnCancel.addEventListener('click', close);
        btnClose.addEventListener('click', close);
        
        // 按Escape键取消，Ctrl+Enter保存
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                close();
            } else if (e.key === 'Enter' && e.ctrlKey) {
                save();
            }
        });

        // 点击背景关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                close();
            }
        });
    }

    /**
     * 处理表格鼠标按下 - 开始选择或调整列宽
     */
    function handleTableMouseDown(e) {
        const th = e.target.closest('th');
        
        // 检查是否在列边界
        if (th && isNearBorder(th, e)) {
            state.isResizing = true;
            state.resizeColumn = th.cellIndex;
            e.preventDefault();
            return;
        }

        // 单元格选择
        const cell = e.target.closest('td');
        if (cell && cell.dataset.row !== undefined) {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);

            if (!e.ctrlKey && !e.metaKey) {
                clearSelection();
            }

            // 开始拖动选择
            state.isSelecting = true;
            state.selectionStart = { row, col };
            state.selectionEnd = { row, col };
            state.currentCell = { row, col };
            
            toggleCellSelection(cell);
            updateCellPosition(row, col);
            
            // 添加selecting类到table
            const table = elements.dataTable.querySelector('table') || elements.dataTable;
            table.classList.add('selecting');
        }
    }

    /**
     * 处理鼠标移动 - 调整列宽或拖动选择
     */
    function handleTableMouseMove(e) {
        if (state.isResizing && state.resizeColumn !== null) {
            const table = elements.dataTable.querySelector('table') || elements.dataTable;
            const ths = table.querySelectorAll('th');
            const th = ths[state.resizeColumn];
            
            if (th) {
                const newWidth = Math.max(40, e.clientX - th.getBoundingClientRect().left);
                th.style.width = newWidth + 'px';
                
                // 同时更新对应列的所有单元格
                const colIndex = state.resizeColumn - 1; // 减1因为第一列是索引列
                if (colIndex >= 0) {
                    const tds = table.querySelectorAll(`td[data-col="${colIndex}"]`);
                    tds.forEach(td => td.style.width = newWidth + 'px');
                    state.columnWidths[colIndex] = newWidth;
                }
            }
            return;
        }

        // 拖动选择
        if (state.isSelecting) {
            const cell = e.target.closest('td');
            if (cell && cell.dataset.row !== undefined) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                state.selectionEnd = { row, col };
                updateSelectionRange();
            }
            return;
        }

        // 鼠标悬停在列边界时改变光标
        const th = e.target.closest('th');
        if (th && isNearBorder(th, e)) {
            th.style.cursor = 'col-resize';
        } else if (th) {
            th.style.cursor = 'default';
        }
    }

    /**
     * 处理鼠标松开 - 结束调整或选择
     */
    function handleTableMouseUp(e) {
        if (state.isResizing) {
            state.isResizing = false;
            state.resizeColumn = null;
        }
        
        if (state.isSelecting) {
            state.isSelecting = false;
            const table = elements.dataTable.querySelector('table') || elements.dataTable;
            table.classList.remove('selecting');
        }
    }

    /**
     * 检查鼠标是否接近列边界
     */
    function isNearBorder(th, e) {
        const rect = th.getBoundingClientRect();
        const borderWidth = 5;
        return e.clientX > rect.right - borderWidth;
    }

    /**
     * 更新选择范围
     */
    function updateSelectionRange() {
        if (!state.selectionStart || !state.selectionEnd) return;

        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

        const table = elements.dataTable.querySelector('table') || elements.dataTable;
        const cells = table.querySelectorAll('td[data-row][data-col]');

        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
                cell.classList.add('in-selection');
            } else {
                cell.classList.remove('in-selection');
            }
        });

        // 更新当前单元格位置显示
        updateCellPosition(state.selectionEnd.row, state.selectionEnd.col);
    }

    /**
     * 更新单元格位置显示
     */
    function updateCellPosition(row, col) {
        const posElement = document.querySelector('.cell-position');
        if (posElement) {
            posElement.textContent = getCellAddress(row, col);
        }
    }

    /**
     * 切换单元格选择状态
     */
    function toggleCellSelection(cell) {
        const key = `${cell.parentElement.rowIndex}-${cell.cellIndex}`;
        if (state.selectedCells.has(key)) {
            state.selectedCells.delete(key);
            cell.classList.remove('selected');
        } else {
            state.selectedCells.add(key);
            cell.classList.add('selected');
        }
    }

    /**
     * 清除所有选择
     */
    function clearSelection() {
        state.selectedCells.clear();
        elements.dataTable.querySelectorAll('td.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
    }

    // ========== 撤销/重做功能 ==========

    /**
     * 添加到历史记录
     */
    function addToHistory(action) {
        // 清除当前索引之后的历史
        state.editHistory = state.editHistory.slice(0, state.historyIndex + 1);
        state.editHistory.push(action);
        state.historyIndex++;
        
        // 限制历史记录数量
        if (state.editHistory.length > 100) {
            state.editHistory.shift();
            state.historyIndex--;
        }
    }

    /**
     * 撤销操作
     */
    function undo() {
        if (state.historyIndex < 0) return;
        
        const action = state.editHistory[state.historyIndex];
        if (action.type === 'edit') {
            const table = elements.dataTable.querySelector('table') || elements.dataTable;
            const row = table.rows[action.row];
            if (row) {
                const cell = row.cells[action.col];
                if (cell) {
                    cell.textContent = action.oldValue;
                    cell.classList.remove('edited');
                }
            }
        }
        
        state.historyIndex--;
        updateStatus(`撤销: ${state.historyIndex + 1}/${state.editHistory.length}`);
    }

    /**
     * 重做操作
     */
    function redo() {
        if (state.historyIndex >= state.editHistory.length - 1) return;
        
        state.historyIndex++;
        const action = state.editHistory[state.historyIndex];
        
        if (action.type === 'edit') {
            const table = elements.dataTable.querySelector('table') || elements.dataTable;
            const row = table.rows[action.row];
            if (row) {
                const cell = row.cells[action.col];
                if (cell) {
                    cell.textContent = action.newValue;
                    cell.classList.add('edited');
                }
            }
        }
        
        updateStatus(`重做: ${state.historyIndex + 1}/${state.editHistory.length}`);
    }

    /**
     * 保存更改
     */
    function saveChanges() {
        if (state.editHistory.length === 0) {
            updateStatus('没有需要保存的更改');
            return;
        }

        // 收集所有编辑记录
        const changes = [];
        state.editHistory.forEach(action => {
            if (action.type === 'edit') {
                changes.push({
                    row: action.row,
                    col: action.col,
                    value: action.newValue
                });
            }
        });

        if (changes.length === 0) {
            updateStatus('没有需要保存的更改');
            return;
        }

        // 显示保存中状态
        showLoading(true);
        updateStatus(`正在保存 ${changes.length} 个更改...`);

        // 发送保存请求到后端
        vscode.postMessage({
            command: 'saveEdits',
            key: state.selectedKey,
            changes: changes
        });
        
        // 标记为已保存（清除编辑标记但保留历史以支持撤销）
        elements.dataTable.querySelectorAll('td.edited').forEach(cell => {
            cell.classList.remove('edited');
            cell.classList.add('saved');
        });
    }

    /**
     * 处理保存响应
     */
    function handleSaveResponse(response) {
        showLoading(false);
        if (response.success) {
            updateStatus(response.message || `成功保存 ${response.modified || 0} 个更改`);
            // 保存成功后，可以选择清空历史或保留以支持撤销
            // 这里保留历史以支持保存后撤销
        } else {
            showError(`保存失败: ${response.error}`);
            // 恢复编辑标记
            elements.dataTable.querySelectorAll('td.saved').forEach(cell => {
                cell.classList.remove('saved');
                cell.classList.add('edited');
            });
        }
    }

    // ========== 增强绘图功能 ==========

    /**
     * 处理绘图 - 支持多参数选择
     */
    function handlePlot() {
        if (!state.selectedKey) return;

        const chartType = elements.chartType.value;
        
        // 显示参数选择对话框
        showPlotDialog(chartType);
    }

    /**
     * 显示绘图参数对话框
     */
    function showPlotDialog(chartType) {
        const tensor = state.tensors.find(t => t.key === state.selectedKey);
        if (!tensor) return;
        
        // 使用当前保存的参数
        const params = state.plotParams;

        const dialog = document.createElement('div');
        dialog.className = 'plot-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>绘图参数配置</h3>
                <div class="dialog-body">
                    <label>图表类型:
                        <select id="dialogChartType" class="select">
                            <option value="line" ${params.chartType === 'line' ? 'selected' : ''}>折线图</option>
                            <option value="bar" ${params.chartType === 'bar' ? 'selected' : ''}>柱状图</option>
                            <option value="scatter" ${params.chartType === 'scatter' ? 'selected' : ''}>散点图</option>
                            <option value="heatmap" ${params.chartType === 'heatmap' ? 'selected' : ''}>热力图</option>
                            <option value="histogram" ${params.chartType === 'histogram' ? 'selected' : ''}>直方图</option>
                            <option value="box" ${params.chartType === 'box' ? 'selected' : ''}>箱线图</option>
                            <option value="image" ${params.chartType === 'image' ? 'selected' : ''}>图像</option>
                        </select>
                    </label>
                    <label>X轴维度:
                        <select id="dialogXAxis" class="select">
                            ${tensor.info.shape.map((s, i) => `<option value="${i}" ${params.xAxis === i ? 'selected' : ''}>维度 ${i} (${s})</option>`).join('')}
                        </select>
                    </label>
                    <label>Y轴维度:
                        <select id="dialogYAxis" class="select">
                            ${tensor.info.shape.map((s, i) => `<option value="${i}" ${params.yAxis === i ? 'selected' : ''}>维度 ${i} (${s})</option>`).join('')}
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" id="dialogShowLegend" ${params.showLegend ? 'checked' : ''}> 显示图例
                    </label>
                    <label>
                        <input type="checkbox" id="dialogShowGrid" ${params.showGrid ? 'checked' : ''}> 显示网格
                    </label>
                    <label>颜色方案:
                        <select id="dialogColorScheme" class="select">
                            <option value="Viridis" ${params.colorScheme === 'Viridis' ? 'selected' : ''}>Viridis</option>
                            <option value="Plasma" ${params.colorScheme === 'Plasma' ? 'selected' : ''}>Plasma</option>
                            <option value="Blues" ${params.colorScheme === 'Blues' ? 'selected' : ''}>Blues</option>
                            <option value="Reds" ${params.colorScheme === 'Reds' ? 'selected' : ''}>Reds</option>
                            <option value="Greens" ${params.colorScheme === 'Greens' ? 'selected' : ''}>Greens</option>
                        </select>
                    </label>
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary" id="dialogCancel">取消</button>
                    <button class="btn btn-primary" id="dialogConfirm">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // 绑定事件
        document.getElementById('dialogCancel').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('dialogConfirm').addEventListener('click', () => {
            // 保存参数
            state.plotParams = {
                chartType: document.getElementById('dialogChartType').value,
                xAxis: parseInt(document.getElementById('dialogXAxis').value),
                yAxis: parseInt(document.getElementById('dialogYAxis').value),
                showLegend: document.getElementById('dialogShowLegend').checked,
                showGrid: document.getElementById('dialogShowGrid').checked,
                colorScheme: document.getElementById('dialogColorScheme').value
            };
            
            // 更新左侧选择器
            elements.chartType.value = state.plotParams.chartType;

            showLoading(true);
            vscode.postMessage({
                command: 'plot',
                key: state.selectedKey,
                params: state.plotParams
            });

            dialog.remove();
            switchTab('chart');
        });
    }

    // 启动
    init();
})();
