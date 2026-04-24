# libcimbar WASM 文件

## 下载 libcimbar WASM 版本

你需要从 libcimbar 项目获取编译好的 WASM 文件：

### 方法 1: 从官网下载

访问 <https://cimbar.org> 并下载最新的 WASM 版本

### 方法 2: 从 GitHub Releases 下载

1. 访问 <https://github.com/sz3/libcimbar/releases>
2. 下载最新的 `cimbar_js.html` 文件
3. 提取其中的 `cimbar.js` 和 `cimbar.wasm` 文件

### 方法 3: 自己编译

```bash
git clone https://github.com/sz3/libcimbar.git
cd libcimbar
./package-wasm.sh
```

## 文件结构

将以下文件放在此目录（文件名可自定义，但需更新配置）：

- `cimbar.js` - JavaScript 绑定
- `cimbar.wasm` - WebAssembly 二进制文件

> 如果希望保留官方带时间戳的文件名，可在 `.env` 或 `.env.local` 中配置：
>
> ```
> VITE_CIMBAR_JS=cimbar_js.2025-10-13T0307.js
> VITE_CIMBAR_WASM=cimbar_js.2025-10-13T0307.wasm
> ```
>
> 未配置时默认加载 `cimbar.js` / `cimbar.wasm`。

## 使用说明

编码器和解码器会自动加载这些文件。确保：

1. 文件命名正确
2. 文件在 `public/wasm/` 目录下
3. 构建时会自动复制到 `dist/wasm/`

## 参考链接

- libcimbar 项目: <https://github.com/sz3/libcimbar>
- 在线演示: <https://cimbar.org>
- 详细文档: <https://github.com/sz3/libcimbar/blob/master/WASM.md>
