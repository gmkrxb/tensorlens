#!/usr/bin/env python3
"""
张量文件处理脚本
支持 .npz, .npy, .pt, .pth 格式
"""
import sys
import json
import os
import re
from pathlib import Path


def load_numpy():
    """动态导入numpy"""
    try:
        import numpy as np
        return np
    except ImportError:
        raise ImportError("需要安装numpy: pip install numpy")


def load_torch():
    """动态导入torch"""
    try:
        import torch
        return torch
    except ImportError:
        raise ImportError("需要安装pytorch: pip install torch")


def get_file_type(file_path: str) -> str:
    """获取文件类型"""
    ext = Path(file_path).suffix.lower()
    if ext in ['.npz', '.npy']:
        return 'numpy'
    elif ext in ['.pt', '.pth']:
        return 'torch'
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


def load_tensor_file(file_path: str) -> dict:
    """加载张量文件"""
    file_type = get_file_type(file_path)
    
    if file_type == 'numpy':
        return load_numpy_file(file_path)
    else:
        return load_torch_file(file_path)


def load_numpy_file(file_path: str) -> dict:
    """加载numpy文件"""
    np = load_numpy()
    ext = Path(file_path).suffix.lower()
    
    if ext == '.npy':
        data = np.load(file_path, allow_pickle=True)
        tensors = [create_tensor_item('data', data, np)]
    else:  # .npz
        npz = np.load(file_path, allow_pickle=True)
        tensors = [create_tensor_item(key, npz[key], np) for key in npz.files]
    
    total_size = sum(t['info']['size'] * get_dtype_size(t['info']['dtype']) for t in tensors)
    
    return {
        'file': file_path,
        'fileType': ext[1:],
        'tensors': tensors,
        'totalSize': total_size
    }


def load_torch_file(file_path: str) -> dict:
    """加载torch文件"""
    torch = load_torch()
    np = load_numpy()
    
    data = torch.load(file_path, map_location='cpu', weights_only=False)
    tensors = []
    
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, torch.Tensor):
                arr = value.detach().numpy()
                tensors.append(create_tensor_item(key, arr, np))
            elif isinstance(value, dict):
                # 嵌套字典（如state_dict）
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, torch.Tensor):
                        arr = sub_value.detach().numpy()
                        tensors.append(create_tensor_item(f"{key}.{sub_key}", arr, np))
    elif isinstance(data, torch.Tensor):
        arr = data.detach().numpy()
        tensors.append(create_tensor_item('data', arr, np))
    
    ext = Path(file_path).suffix.lower()
    total_size = sum(t['info']['size'] * get_dtype_size(t['info']['dtype']) for t in tensors)
    
    return {
        'file': file_path,
        'fileType': ext[1:],
        'tensors': tensors,
        'totalSize': total_size
    }


def create_tensor_item(key: str, data, np) -> dict:
    """创建张量项"""
    # 获取预览数据
    preview = get_preview_data(data, np)
    
    # 计算统计信息
    stats = {}
    try:
        if np.issubdtype(data.dtype, np.number):
            stats = {
                'min': float(np.min(data)),
                'max': float(np.max(data)),
                'mean': float(np.mean(data)),
                'std': float(np.std(data))
            }
    except:
        pass
    
    return {
        'key': key,
        'info': {
            'key': key,
            'shape': list(data.shape),
            'dtype': str(data.dtype),
            'size': int(data.size),
            **stats
        },
        'preview': preview
    }


def get_preview_data(data, np, max_rows=100, max_cols=20):
    """获取预览数据"""
    try:
        if data.ndim == 0:
            return [[data.item()]]
        elif data.ndim == 1:
            return data[:max_rows].tolist()
        elif data.ndim == 2:
            return data[:max_rows, :max_cols].tolist()
        else:
            # 高维数据，展示前两维
            flat = data.reshape(-1, data.shape[-1])
            return flat[:max_rows, :max_cols].tolist()
    except:
        return []


def get_dtype_size(dtype: str) -> int:
    """获取数据类型字节大小"""
    dtype_sizes = {
        'float64': 8, 'float32': 4, 'float16': 2,
        'int64': 8, 'int32': 4, 'int16': 2, 'int8': 1,
        'uint64': 8, 'uint32': 4, 'uint16': 2, 'uint8': 1,
        'bool': 1, 'complex64': 8, 'complex128': 16
    }
    for key, size in dtype_sizes.items():
        if key in dtype:
            return size
    return 4  # 默认


def search_tensor(file_path: str, query: str, regex: bool, case_sensitive: bool) -> list:
    """搜索张量数据"""
    np = load_numpy()
    file_type = get_file_type(file_path)
    results = []
    
    # 加载数据
    if file_type == 'numpy':
        ext = Path(file_path).suffix.lower()
        if ext == '.npy':
            arrays = {'data': np.load(file_path, allow_pickle=True)}
        else:
            npz = np.load(file_path, allow_pickle=True)
            arrays = {k: npz[k] for k in npz.files}
    else:
        torch = load_torch()
        loaded = torch.load(file_path, map_location='cpu', weights_only=False)
        arrays = {}
        if isinstance(loaded, dict):
            for k, v in loaded.items():
                if isinstance(v, torch.Tensor):
                    arrays[k] = v.detach().numpy()
        elif isinstance(loaded, torch.Tensor):
            arrays['data'] = loaded.detach().numpy()
    
    # 对每个数组进行搜索
    for key, arr in arrays.items():
        matches = []
        
        # 搜索键名
        key_match = False
        if regex:
            pattern = re.compile(query, 0 if case_sensitive else re.IGNORECASE)
            key_match = bool(pattern.search(key))
        else:
            if case_sensitive:
                key_match = query in key
            else:
                key_match = query.lower() in key.lower()
        
        if key_match:
            matches.append({'position': 'key', 'value': key, 'context': '键名匹配'})
        
        # 搜索数据内容（数值）
        try:
            # 尝试将查询转换为数值
            if not regex:
                try:
                    query_num = float(query)
                    # 在数组中查找匹配的值
                    if arr.dtype.kind in ['i', 'u', 'f']:  # 整数或浮点数
                        # 查找相等的值
                        if arr.dtype.kind == 'f':
                            # 浮点数使用近似匹配
                            found_indices = np.where(np.abs(arr - query_num) < 1e-6)
                        else:
                            found_indices = np.where(arr == int(query_num))
                        
                        # 限制返回数量，避免结果过多
                        max_results = 100
                        count = min(len(found_indices[0]), max_results)
                        
                        for i in range(count):
                            pos = tuple(idx[i] for idx in found_indices)
                            value = arr[pos]
                            matches.append({
                                'position': str(pos),
                                'value': str(value),
                                'context': f'位置 {pos}'
                            })
                        
                        if len(found_indices[0]) > max_results:
                            matches.append({
                                'position': '...',
                                'value': f'还有 {len(found_indices[0]) - max_results} 个匹配',
                                'context': '结果已截断'
                            })
                except (ValueError, TypeError):
                    # 不是数值，跳过数据搜索
                    pass
        except Exception as e:
            # 搜索失败，只返回键名匹配
            pass
        
        if matches:
            results.append({
                'key': key,
                'matches': matches,
                'totalMatches': len(matches)
            })
    
    return results


def filter_tensor(file_path: str, key: str = None, shape: list = None, dtype: str = None) -> dict:
    """筛选张量数据"""
    data = load_tensor_file(file_path)
    
    filtered = []
    for tensor in data['tensors']:
        info = tensor['info']
        
        if key and key.lower() not in info['key'].lower():
            continue
        if shape and info['shape'] != shape:
            continue
        if dtype and dtype.lower() not in info['dtype'].lower():
            continue
        
        filtered.append(tensor)
    
    data['tensors'] = filtered
    return data


def prepare_plot_data(file_path: str, plot_type: str, keys: list, options: dict) -> dict:
    """准备绑图数据"""
    np = load_numpy()
    file_type = get_file_type(file_path)
    
    if file_type == 'numpy':
        ext = Path(file_path).suffix.lower()
        if ext == '.npy':
            arrays = {'data': np.load(file_path, allow_pickle=True)}
        else:
            arrays = dict(np.load(file_path, allow_pickle=True))
    else:
        torch = load_torch()
        loaded = torch.load(file_path, map_location='cpu', weights_only=False)
        arrays = {}
        if isinstance(loaded, dict):
            for k, v in loaded.items():
                if isinstance(v, torch.Tensor):
                    arrays[k] = v.detach().numpy()
        elif isinstance(loaded, torch.Tensor):
            arrays['data'] = loaded.detach().numpy()
    
    series = []
    for key in keys:
        if key not in arrays:
            continue
        
        arr = arrays[key]
        
        if plot_type == 'image':
            # 图像类型需要2D数据
            if arr.ndim == 1:
                size = int(np.sqrt(len(arr)))
                arr = arr[:size*size].reshape(size, size)
            elif arr.ndim > 2:
                arr = arr.reshape(arr.shape[0], -1)
            
            series.append({
                'name': key,
                'z': arr.tolist()
            })
        elif plot_type == 'heatmap':
            if arr.ndim == 1:
                arr = arr.reshape(1, -1)
            elif arr.ndim > 2:
                arr = arr.reshape(arr.shape[0], -1)
            
            series.append({
                'name': key,
                'z': arr[:100, :100].tolist()
            })
        else:
            # 线图、柱状图等
            flat = arr.flatten()[:10000]
            series.append({
                'name': key,
                'x': list(range(len(flat))),
                'y': flat.tolist()
            })
    
    return {
        'type': plot_type,
        'title': f'{plot_type.title()} - {", ".join(keys)}',
        'data': series
    }


def export_data(file_path: str, key: str, format: str, output: str):
    """导出数据"""
    np = load_numpy()
    file_type = get_file_type(file_path)
    
    # 加载数据
    if file_type == 'numpy':
        ext = Path(file_path).suffix.lower()
        if ext == '.npy':
            arr = np.load(file_path, allow_pickle=True)
        else:
            npz = np.load(file_path, allow_pickle=True)
            arr = npz[key]
    else:
        torch = load_torch()
        loaded = torch.load(file_path, map_location='cpu', weights_only=False)
        if isinstance(loaded, dict):
            arr = loaded[key].detach().numpy()
        else:
            arr = loaded.detach().numpy()
    
    # 导出
    if format == 'csv':
        if arr.ndim == 1:
            arr = arr.reshape(-1, 1)
        elif arr.ndim > 2:
            arr = arr.reshape(arr.shape[0], -1)
        np.savetxt(output, arr, delimiter=',')
    
    elif format == 'json':
        with open(output, 'w') as f:
            json.dump(arr.tolist(), f)
    
    elif format == 'npy':
        np.save(output, arr)
    
    elif format == 'txt':
        np.savetxt(output, arr.flatten(), fmt='%s')
    
    elif format == 'png':
        try:
            import matplotlib.pyplot as plt
            plt.figure(figsize=(10, 8))
            if arr.ndim == 1:
                plt.plot(arr)
            else:
                plt.imshow(arr[:100, :100] if arr.ndim >= 2 else arr)
                plt.colorbar()
            plt.savefig(output, dpi=150)
            plt.close()
        except ImportError:
            raise ImportError("需要安装matplotlib: pip install matplotlib")
    
    return {'success': True, 'output': output}


def get_tensor_info(file_path: str) -> list:
    """获取张量信息（不加载完整数据）"""
    data = load_tensor_file(file_path)
    return [t['info'] for t in data['tensors']]


def get_slice(file_path: str, key: str, slice_spec: str):
    """获取张量切片"""
    np = load_numpy()
    file_type = get_file_type(file_path)
    
    if file_type == 'numpy':
        ext = Path(file_path).suffix.lower()
        if ext == '.npy':
            arr = np.load(file_path, allow_pickle=True)
        else:
            npz = np.load(file_path, allow_pickle=True)
            arr = npz[key]
    else:
        torch = load_torch()
        loaded = torch.load(file_path, map_location='cpu', weights_only=False)
        if isinstance(loaded, dict):
            arr = loaded[key].detach().numpy()
        else:
            arr = loaded.detach().numpy()
    
    # 解析切片
    try:
        sliced = eval(f"arr[{slice_spec}]")
        return sliced.tolist()
    except IndexError as e:
        shape_str = ' × '.join(map(str, arr.shape))
        error_msg = f"切片索引错误：{str(e)}\n\n数组形状：{shape_str}\n切片格式示例：\n- 单层：0 或 1\n- 多层：0,1 或 0,1,:5\n- 完整：使用冒号 : 表示全部，如 :,:,0"
        raise ValueError(error_msg)
    except SyntaxError:
        raise ValueError(f"切片语法错误：'{slice_spec}'\n\n正确格式示例：\n- 单个索引：0\n- 多个索引：0,1,2\n- 范围切片：:10 或 5: 或 2:8\n- 组合：0,1,:5")


def save_edits(file_path: str, key: str, changes: list) -> dict:
    """保存单元格编辑"""
    try:
        np = load_numpy()
        file_type = get_file_type(file_path)
    except Exception as e:
        return {'error': f'初始化失败: {str(e)}'}
    
    def convert_value(value_str: str, dtype):
        """根据数组dtype安全转换值"""
        try:
            # 浮点类型
            if np.issubdtype(dtype, np.floating):
                try:
                    val = float(value_str)
                    if not np.isfinite(val):
                        raise ValueError(f"值 '{value_str}' 不是有效的浮点数")
                    return np.dtype(dtype).type(val)
                except ValueError:
                    raise ValueError(f"无法将 '{value_str}' 转换为浮点数。请输入有效的数字，不能包含汉字、字母或特殊符号")
            
            # 整数类型
            elif np.issubdtype(dtype, np.integer):
                try:
                    # 检查是否包含小数点
                    if '.' in value_str:
                        raise ValueError(f"值 '{value_str}' 包含小数点，但目标类型是整数。请输入整数或先转换数组类型")
                    
                    val = int(value_str)
                    # 获取类型的范围
                    info = np.iinfo(dtype)
                    if val < info.min or val > info.max:
                        raise ValueError(f"值 {val} 超出 {dtype} 类型范围 [{info.min:,}, {info.max:,}]。\n提示：{dtype} 最大值为 {info.max:,}")
                    return np.dtype(dtype).type(val)
                except ValueError as ve:
                    # 如果是已知的ValueError，直接抛出
                    if "超出" in str(ve) or "包含小数点" in str(ve):
                        raise
                    # 否则是无法转换为int的错误
                    raise ValueError(f"无法将 '{value_str}' 转换为整数。请输入有效的整数，不能包含汉字、字母、符号或小数点")
            
            # 布尔类型
            elif np.issubdtype(dtype, np.bool_):
                lower = value_str.lower().strip()
                if lower in ('true', '1', 'yes', 't', 'y'):
                    return True
                elif lower in ('false', '0', 'no', 'f', 'n'):
                    return False
                else:
                    raise ValueError(f"无法将 '{value_str}' 转换为布尔值。请输入 true/false 或 1/0")
            
            # 复数类型
            elif np.issubdtype(dtype, np.complexfloating):
                try:
                    return np.dtype(dtype).type(complex(value_str))
                except ValueError:
                    raise ValueError(f"无法将 '{value_str}' 转换为复数")
            
            # 其他类型（字符串等）
            else:
                return value_str
                
        except (ValueError, OverflowError) as e:
            # 如果已经是友好的错误信息，直接抛出
            if any(keyword in str(e) for keyword in ['无法', '超出', '请输入', '不能包含']):
                raise
            # 否则包装为更友好的错误信息
            raise ValueError(f"数据类型错误：无法将 '{value_str}' 保存为 {dtype} 类型。{str(e)}")
    
    try:
        # 加载原始数据
        if file_type == 'numpy':
            ext = Path(file_path).suffix.lower()
            if ext == '.npy':
                arr = np.load(file_path, allow_pickle=True)
                
                # 应用修改
                for i, change in enumerate(changes):
                    try:
                        row, col = change['row'], change['col']
                        value = convert_value(change['value'], arr.dtype)
                        if arr.ndim == 1:
                            arr[row] = value
                        elif arr.ndim == 2:
                            arr[row, col] = value
                        else:
                            # 多维数组，展平后修改
                            flat_idx = row * arr.shape[-1] + col
                            arr.flat[flat_idx] = value
                    except ValueError as ve:
                        # 添加位置信息
                        return {'error': f"第 {i+1} 处修改失败（位置 [{row}, {col}]）：{str(ve)}"}
                    except IndexError:
                        return {'error': f"第 {i+1} 处修改失败：位置 [{row}, {col}] 超出数组范围"}
                
                # 保存回文件
                np.save(file_path, arr)
                
            else:  # .npz
                npz = np.load(file_path, allow_pickle=True)
                arrays = {k: npz[k] for k in npz.files}
                arr = arrays[key].copy()
                
                # 应用修改
                for i, change in enumerate(changes):
                    try:
                        row, col = change['row'], change['col']
                        value = convert_value(change['value'], arr.dtype)
                        if arr.ndim == 1:
                            arr[row] = value
                        elif arr.ndim == 2:
                            arr[row, col] = value
                        else:
                            flat_idx = row * arr.shape[-1] + col
                            arr.flat[flat_idx] = value
                    except ValueError as ve:
                        return {'error': f"第 {i+1} 处修改失败（位置 [{row}, {col}]）：{str(ve)}"}
                    except IndexError:
                        return {'error': f"第 {i+1} 处修改失败：位置 [{row}, {col}] 超出数组范围"}
                
                arrays[key] = arr
                # 保存回文件
                np.savez(file_path, **arrays)
        else:
            # PyTorch文件暂不支持保存
            raise ValueError("PyTorch文件暂不支持编辑保存")
        
        return {'success': True, 'modified': len(changes), 'message': f'已成功保存 {len(changes)} 处修改'}
    
    except PermissionError:
        return {'error': f'文件被占用或没有写入权限：{file_path}'}
    except Exception as e:
        # 其他未预期的错误
        return {'error': f'保存失败：{type(e).__name__}: {str(e)}'}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': '参数不足'}))
        sys.exit(1)
    
    command = sys.argv[1]
    args = json.loads(sys.argv[2])
    
    try:
        if command == 'load':
            result = load_tensor_file(args['file'])
        elif command == 'search':
            result = search_tensor(
                args['file'], 
                args['query'],
                args.get('regex', False),
                args.get('caseSensitive', False)
            )
        elif command == 'filter':
            result = filter_tensor(
                args['file'],
                args.get('key'),
                args.get('shape'),
                args.get('dtype')
            )
        elif command == 'plot':
            result = prepare_plot_data(
                args['file'],
                args['type'],
                args['keys'],
                args.get('options', {})
            )
        elif command == 'export':
            result = export_data(
                args['file'],
                args['key'],
                args['format'],
                args['output']
            )
        elif command == 'info':
            result = get_tensor_info(args['file'])
        elif command == 'slice':
            result = get_slice(args['file'], args['key'], args['slice'])
        elif command == 'save':
            result = save_edits(args['file'], args['key'], args['changes'])
        else:
            result = {'error': f'未知命令: {command}'}
        
        print(json.dumps(result, ensure_ascii=False))
    
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
