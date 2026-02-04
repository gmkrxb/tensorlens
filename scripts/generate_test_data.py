"""
生成各种类型和形状的测试数据
用于测试 TensorLens 插件的各种功能
"""

import os
import numpy as np
import zipfile
import tarfile
from pathlib import Path

# 创建测试数据目录
test_dir = Path(__file__).parent.parent / "test_data"
test_dir.mkdir(exist_ok=True)

print("🚀 开始生成测试数据...")
print(f"📁 输出目录: {test_dir}\n")

# ============ NumPy 数组测试 ============
print("📊 生成 NumPy 数组...")

# 1. 不同维度的数组
np.save(test_dir / "1d_array.npy", np.arange(100))
np.save(test_dir / "2d_matrix.npy", np.random.randn(10, 20))
np.save(test_dir / "3d_tensor.npy", np.random.randn(5, 10, 15))
np.save(test_dir / "4d_batch.npy", np.random.randn(4, 3, 32, 32))  # 模拟图像批次
np.save(test_dir / "5d_video.npy", np.random.randn(2, 10, 3, 64, 64))  # 模拟视频

# 2. 不同数据类型
np.save(test_dir / "int8_array.npy", np.random.randint(-128, 127, (100,), dtype=np.int8))
np.save(test_dir / "int16_array.npy", np.random.randint(-1000, 1000, (100,), dtype=np.int16))
np.save(test_dir / "int32_array.npy", np.random.randint(-100000, 100000, (100,), dtype=np.int32))
np.save(test_dir / "int64_array.npy", np.random.randint(-1000000, 1000000, (100,), dtype=np.int64))
np.save(test_dir / "uint8_image.npy", np.random.randint(0, 256, (256, 256, 3), dtype=np.uint8))
np.save(test_dir / "float16_array.npy", np.random.randn(100).astype(np.float16))
np.save(test_dir / "float32_array.npy", np.random.randn(100).astype(np.float32))
np.save(test_dir / "float64_array.npy", np.random.randn(100).astype(np.float64))
np.save(test_dir / "bool_array.npy", np.random.choice([True, False], 100))
np.save(test_dir / "complex64_array.npy", np.random.randn(50) + 1j * np.random.randn(50))
np.save(test_dir / "complex128_array.npy", (np.random.randn(50) + 1j * np.random.randn(50)).astype(np.complex128))

# 3. 特殊形状
np.save(test_dir / "scalar.npy", np.array(42.0))
np.save(test_dir / "empty_array.npy", np.array([]))
np.save(test_dir / "single_element.npy", np.array([3.14]))
np.save(test_dir / "huge_1d.npy", np.arange(1000000))  # 大数组
np.save(test_dir / "tiny_2d.npy", np.array([[1, 2], [3, 4]]))

# 4. 特殊值
np.save(test_dir / "with_nan.npy", np.array([1.0, np.nan, 3.0, np.inf, -np.inf]))
np.save(test_dir / "all_zeros.npy", np.zeros((10, 10)))
np.save(test_dir / "all_ones.npy", np.ones((10, 10)))
np.save(test_dir / "identity_matrix.npy", np.eye(20))

# 5. .npz 文件（多个数组）
np.savez(test_dir / "multiple_arrays.npz",
         train_data=np.random.randn(1000, 784),
         train_labels=np.random.randint(0, 10, 1000),
         test_data=np.random.randn(200, 784),
         test_labels=np.random.randint(0, 10, 200),
         weights=np.random.randn(784, 10),
         bias=np.random.randn(10))

np.savez(test_dir / "image_batch.npz",
         images=np.random.randint(0, 256, (10, 224, 224, 3), dtype=np.uint8),
         labels=np.array(['cat', 'dog', 'bird', 'fish', 'horse', 'car', 'plane', 'ship', 'tree', 'flower']),
         metadata={'source': 'test', 'date': '2026-02-04'})

# 6. .npz 压缩文件
np.savez_compressed(test_dir / "compressed_data.npz",
                    large_matrix=np.random.randn(1000, 1000),
                    sparse_data=np.random.choice([0, 1], (1000, 1000), p=[0.95, 0.05]))

print(f"  ✓ 生成 {len(list(test_dir.glob('*.npy')))} 个 .npy 文件")
print(f"  ✓ 生成 {len(list(test_dir.glob('*.npz')))} 个 .npz 文件")

# ============ PyTorch 张量测试 ============
try:
    import torch
    print("\n🔥 生成 PyTorch 张量...")
    
    # 1. 基本张量
    torch.save(torch.randn(100), test_dir / "1d_tensor.pt")
    torch.save(torch.randn(10, 20), test_dir / "2d_tensor.pt")
    torch.save(torch.randn(5, 10, 15), test_dir / "3d_tensor.pt")
    torch.save(torch.randn(4, 3, 224, 224), test_dir / "image_batch.pt")  # ImageNet尺寸
    torch.save(torch.randn(8, 512, 7, 7), test_dir / "feature_maps.pt")  # CNN特征图
    
    # 2. 不同数据类型
    torch.save(torch.randint(-128, 127, (100,), dtype=torch.int8), test_dir / "int8_tensor.pt")
    torch.save(torch.randint(-100, 100, (100,), dtype=torch.int32), test_dir / "int32_tensor.pt")
    torch.save(torch.randint(0, 100, (100,), dtype=torch.int64), test_dir / "int64_tensor.pt")
    torch.save(torch.randn(100).half(), test_dir / "float16_tensor.pt")  # FP16
    torch.save(torch.randn(100), test_dir / "float32_tensor.pt")
    torch.save(torch.randn(100).double(), test_dir / "float64_tensor.pt")
    torch.save(torch.randint(0, 2, (100,), dtype=torch.bool), test_dir / "bool_tensor.pt")
    
    # 3. GPU 张量（会保存为 CPU）
    if torch.cuda.is_available():
        torch.save(torch.randn(100).cuda(), test_dir / "gpu_tensor.pt")
    
    # 4. 模型权重字典
    model_state = {
        'conv1.weight': torch.randn(64, 3, 7, 7),
        'conv1.bias': torch.randn(64),
        'fc1.weight': torch.randn(1000, 2048),
        'fc1.bias': torch.randn(1000),
        'epoch': 42,
        'accuracy': 0.95
    }
    torch.save(model_state, test_dir / "model_weights.pth")
    
    # 5. 完整模型检查点
    checkpoint = {
        'model_state_dict': {
            'layer1.weight': torch.randn(128, 64, 3, 3),
            'layer1.bias': torch.randn(128),
            'layer2.weight': torch.randn(256, 128, 3, 3),
            'layer2.bias': torch.randn(256),
        },
        'optimizer_state_dict': {
            'state': {},
            'param_groups': [{'lr': 0.001, 'momentum': 0.9}]
        },
        'epoch': 100,
        'loss': 0.123,
        'best_acc': 0.987
    }
    torch.save(checkpoint, test_dir / "checkpoint.pth")
    
    # 6. 复杂嵌套结构
    complex_data = {
        'tensors': [torch.randn(10, 10) for _ in range(5)],
        'lists': [[1, 2, 3], [4, 5, 6]],
        'nested': {
            'a': torch.randn(5),
            'b': {'c': torch.randn(3, 3), 'd': 'test_string'},
            'e': [torch.randn(2), torch.randn(4)]
        },
        'metadata': {
            'version': '1.0.0',
            'date': '2026-02-04',
            'author': 'TensorLens'
        }
    }
    torch.save(complex_data, test_dir / "complex_structure.pt")
    
    print(f"  ✓ 生成 {len(list(test_dir.glob('*.pt')))} 个 .pt 文件")
    print(f"  ✓ 生成 {len(list(test_dir.glob('*.pth')))} 个 .pth 文件")
    
except ImportError:
    print("\n⚠️  PyTorch 未安装，跳过 .pt/.pth 文件生成")

# ============ 压缩文件测试 ============
print("\n📦 生成压缩文件...")

# 1. ZIP 文件
with zipfile.ZipFile(test_dir / "sample_archive.zip", 'w') as zf:
    zf.writestr("readme.txt", "This is a test archive created by TensorLens")
    zf.writestr("data/config.json", '{"model": "test", "version": "1.0"}')
    zf.writestr("data/values.txt", "\n".join([str(i) for i in range(100)]))
    # 添加一些 numpy 数据
    import io
    buffer = io.BytesIO()
    np.save(buffer, np.random.randn(50, 50))
    zf.writestr("tensors/matrix.npy", buffer.getvalue())

# 2. 包含图片的 ZIP
with zipfile.ZipFile(test_dir / "images.zip", 'w') as zf:
    for i in range(5):
        img_data = np.random.randint(0, 256, (64, 64, 3), dtype=np.uint8)
        buffer = io.BytesIO()
        np.save(buffer, img_data)
        zf.writestr(f"images/image_{i:03d}.npy", buffer.getvalue())

# 3. 多级目录结构
with zipfile.ZipFile(test_dir / "nested_structure.zip", 'w') as zf:
    zf.writestr("root.txt", "root level")
    zf.writestr("folder1/file1.txt", "content 1")
    zf.writestr("folder1/file2.txt", "content 2")
    zf.writestr("folder1/subfolder/deep.txt", "deep content")
    zf.writestr("folder2/data.txt", "data content")

# 4. TAR 文件
with tarfile.open(test_dir / "sample_archive.tar", 'w') as tf:
    # 创建临时文件并添加到 tar
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmp:
        tmp.write("TAR archive test file")
        tmp_path = tmp.name
    tf.add(tmp_path, arcname="test_file.txt")
    os.unlink(tmp_path)

# 5. TAR.GZ 文件
with tarfile.open(test_dir / "compressed_archive.tar.gz", 'w:gz') as tf:
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmp:
        tmp.write("Compressed TAR.GZ test file\n" * 100)
        tmp_path = tmp.name
    tf.add(tmp_path, arcname="large_text.txt")
    os.unlink(tmp_path)

print(f"  ✓ 生成 {len(list(test_dir.glob('*.zip')))} 个 .zip 文件")
print(f"  ✓ 生成 {len(list(test_dir.glob('*.tar*')))} 个 .tar 文件")

# ============ 特殊测试文件 ============
print("\n🎯 生成特殊测试文件...")

# 1. 超大文件（用于性能测试）
np.save(test_dir / "large_10mb.npy", np.random.randn(1000, 1000))  # ~8MB

# 2. 超小文件
np.save(test_dir / "tiny.npy", np.array([1]))

# 3. 文件名包含特殊字符
np.save(test_dir / "带中文名称的文件.npy", np.random.randn(10, 10))
np.save(test_dir / "file with spaces.npy", np.random.randn(5, 5))
np.save(test_dir / "file-with-dashes.npy", np.random.randn(5, 5))
np.save(test_dir / "file_with_underscores.npy", np.random.randn(5, 5))

# 4. 结构化数组
dt = np.dtype([('name', 'U10'), ('age', 'i4'), ('weight', 'f4')])
structured = np.array([
    ('Alice', 25, 55.5),
    ('Bob', 30, 75.2),
    ('Charlie', 35, 68.9)
], dtype=dt)
np.save(test_dir / "structured_array.npy", structured)

# 5. 记录数组
record = np.rec.array([
    ('Alice', 25, 165.5),
    ('Bob', 30, 175.2),
    ('Charlie', 35, 180.0)
], dtype=[('name', 'U10'), ('age', 'i4'), ('height', 'f4')])
np.save(test_dir / "record_array.npy", record)

print("  ✓ 生成特殊测试文件")

# ============ 统计信息 ============
print("\n" + "="*60)
print("📊 生成完成统计:")
print("="*60)

total_size = sum(f.stat().st_size for f in test_dir.iterdir() if f.is_file())
file_counts = {
    '.npy': len(list(test_dir.glob('*.npy'))),
    '.npz': len(list(test_dir.glob('*.npz'))),
    '.pt': len(list(test_dir.glob('*.pt'))),
    '.pth': len(list(test_dir.glob('*.pth'))),
    '.zip': len(list(test_dir.glob('*.zip'))),
    '.tar*': len(list(test_dir.glob('*.tar*')))
}

for ext, count in file_counts.items():
    if count > 0:
        print(f"  {ext:8s}: {count:3d} 个文件")

print(f"\n  总大小: {total_size / (1024*1024):.2f} MB")
print(f"  总文件数: {sum(file_counts.values())} 个")
print(f"\n📁 所有文件位于: {test_dir.absolute()}")
print("\n✨ 测试数据生成完成！现在可以用 TensorLens 打开这些文件进行测试了。")
