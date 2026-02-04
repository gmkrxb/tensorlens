/**
 * 类型定义
 */

// ========== 张量相关类型 ==========

export interface TensorInfo {
    key: string;
    shape: number[];
    dtype: string;
    size: number;
    min?: number;
    max?: number;
    mean?: number;
    std?: number;
}

export interface TensorData {
    file: string;
    fileType: 'npz' | 'npy' | 'pt' | 'pth';
    tensors: TensorItem[];
    totalSize: number;
}

export interface TensorItem {
    key: string;
    info: TensorInfo;
    preview?: unknown[][];  // 预览数据（前N行）
    fullData?: unknown;     // 完整数据（按需加载）
}

export interface SearchResult {
    key: string;
    matches: SearchMatch[];
}

export interface SearchMatch {
    position: number[];
    value: unknown;
    context?: string;
}

export interface PlotData {
    type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'histogram' | 'image';
    title: string;
    data: PlotSeries[];
    layout?: PlotLayout;
}

export interface PlotSeries {
    name: string;
    x?: number[];
    y: number[];
    z?: number[][];
}

export interface PlotLayout {
    xaxis?: { title: string };
    yaxis?: { title: string };
    width?: number;
    height?: number;
}

// ========== 压缩文件相关类型 ==========

export interface ArchiveEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    compressedSize?: number;
    modifiedTime?: Date;
}

export interface FilePreview {
    type: 'text' | 'image' | 'binary';
    content: string;
    path: string;
    language?: string;
    size?: number;
}

// ========== 消息类型 ==========

export interface WebviewMessage {
    command: string;
    [key: string]: unknown;
}

export interface TensorViewerState {
    file: string;
    selectedKey?: string;
    searchQuery?: string;
    filter?: unknown;
    plotConfig?: unknown;
}

export interface ArchiveViewerState {
    file: string;
    selectedEntry?: string;
    searchQuery?: string;
    expandedPaths: string[];
}
