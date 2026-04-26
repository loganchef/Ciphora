# Ciphora Tauri 2.0 迁移指南

## 📦 安装 Tauri 依赖

### 1. 安装 Rust（如果还没有）
```powershell
# Windows
winget install --id Rustlang.Rustup
```

### 2. 安装 Tauri CLI
```bash
npm install --save-dev @tauri-apps/cli@next
npm install @tauri-apps/api@next
npm install @tauri-apps/plugin-fs@next
npm install @tauri-apps/plugin-dialog@next
```

### 3. 初始化 Tauri 项目
```bash
npm run tauri init
```

配置选项：
- App name: `Ciphora`
- Window title: `Ciphora - 密码管理器`
- Web assets: `dist`
- Dev server: `http://localhost:3000`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

## 🔄 迁移对照表

### IPC 通信迁移

| Electron | Tauri 2.0 |
|----------|-----------|
| `ipcMain.handle()` | `#[tauri::command]` |
| `ipcRenderer.invoke()` | `invoke()` from @tauri-apps/api/core |
| `electron.app.getPath()` | `path` from @tauri-apps/api |

### 文件系统迁移

| Electron | Tauri 2.0 |
|----------|-----------|
| `fs.readFile()` | `readTextFile()` from @tauri-apps/plugin-fs |
| `fs.writeFile()` | `writeTextFile()` from @tauri-apps/plugin-fs |
| `dialog.showOpenDialog()` | `open()` from @tauri-apps/plugin-dialog |

## 📱 移动端支持

### Android 支持
```bash
npm run tauri android init
npm run tauri android dev
npm run tauri android build
```

### iOS 支持
```bash
npm run tauri ios init
npm run tauri ios dev
npm run tauri ios build
```

## 🎨 libcimbar 集成

### WASM 版本集成
1. 下载 cimbar.js 和 cimbar.wasm
2. 放入 `public/wasm/` 目录
3. 在 React 中加载和使用

### 功能特性
- **编码速度**: 850 kbps (~106 KB/s)
- **数据传输**: 通过屏幕显示 + 摄像头读取
- **最大文件**: 33MB（压缩后）
- **纠错能力**: 支持 Reed Solomon 纠错

## 🚀 构建命令

```bash
# 开发模式
npm run tauri dev

# 构建所有平台
npm run tauri build

# 构建特定平台
npm run tauri build -- --target x86_64-pc-windows-msvc
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-unknown-linux-gnu
```

## ⚡ 性能优势

- 打包体积: ~3-5MB（vs Electron 的 50-80MB）
- 内存占用: ~50MB（vs Electron 的 200-300MB）
- 启动速度: 更快
- 安全性: Rust 内存安全 + 权限系统




