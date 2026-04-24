fe# 🎯 Ciphora + Tauri 2.0 + libcimbar

> **密码管理器** × **跨平台框架** × **高速二维码传输** = 🚀

## 🌟 特性亮点

### 📱 全平台支持

- ✅ Windows / macOS / Linux（桌面端）
- ✅ Android / iOS（移动端）
- ✅ 一套代码，六个平台

### 🔐 企业级安全

- **Argon2** 密码哈希（抗暴力破解）
- **AES-256-GCM** 加密（军用级）
- **TOTP** 双因素认证
- **Rust** 内存安全

### ⚡ 超高性能

- **打包体积**: ~5 MB（vs Electron 的 80 MB）
- **内存占用**: ~50 MB（vs Electron 的 200 MB）
- **启动速度**: <1 秒（vs Electron 的 2-3 秒）

### 🎨 libcimbar 集成

- **传输速度**: 最高 106 KB/s（850 kbps）
- **最大文件**: 33 MB（压缩后）
- **完全离线**: 无需网络连接
- **自动纠错**: Reed Solomon 纠错

---

## 🚀 快速开始

### 1️⃣ 自动安装

#### Windows（PowerShell）

```powershell
.\scripts\setup-tauri.ps1
```

#### macOS/Linux

```bash
chmod +x scripts/setup-tauri.sh
./scripts/setup-tauri.sh
```

### 2️⃣ 下载 libcimbar WASM

**方法1: 在线下载（推荐）**

1. 访问 [cimbar.org](https://cimbar.org)
2. 右键"另存为"保存整个页面
3. 提取 `cimbar.js` 和 `cimbar.wasm` 到 `public/wasm/`

**方法2: GitHub Releases**

1. 访问 [libcimbar/releases](https://github.com/sz3/libcimbar/releases)
2. 下载 `cimbar_js.html`
3. 提取 WASM 文件到 `public/wasm/`

### 3️⃣ 开发运行

```bash
# PC 端开发
npm run tauri:dev

# Android 开发（需要 Android Studio）
npm run tauri:android:init  # 仅第一次
npm run tauri:android:dev

# iOS 开发（需要 macOS + Xcode）
npm run tauri:ios:init      # 仅第一次
npm run tauri:ios:dev
```

### 4️⃣ 构建发布

```bash
# PC 端构建
npm run tauri:build

# Android 构建
npm run tauri:android:build

# iOS 构建
npm run tauri:ios:build
```

---

## 📂 项目结构

```
Ciphora/
├── src/                          # React 前端代码
│   ├── components/
│   │   ├── CimbarTransfer.jsx   # 二维码传输组件 ⭐
│   │   └── ...                  # 其他组件
│   ├── api/
│   │   └── tauri-api.js         # Tauri API 封装
│   ├── hooks/
│   │   └── useMobile.js         # 移动端 Hooks
│   └── styles/
│       └── mobile.css           # 移动端样式
│
├── src-tauri/                    # Rust 后端代码 ⭐
│   ├── src/
│   │   ├── main.rs              # 主入口
│   │   ├── commands.rs          # Tauri Commands
│   │   ├── crypto.rs            # 加密模块
│   │   ├── storage.rs           # 存储模块
│   │   └── mfa.rs               # MFA 模块
│   ├── Cargo.toml               # Rust 依赖
│   ├── tauri.conf.json          # Tauri 配置
│   ├── capabilities/
│   │   └── mobile.json          # 移动端权限
│   └── gen/                     # 自动生成
│       ├── android/             # Android 项目
│       └── ios/                 # iOS 项目
│
├── public/
│   └── wasm/                    # libcimbar WASM 文件 ⭐
│       ├── cimbar.js
│       ├── cimbar.wasm
│       └── README.md
│
├── scripts/
│   ├── setup-tauri.ps1          # Windows 安装脚本
│   └── setup-tauri.sh           # macOS/Linux 安装脚本
│
├── TAURI_SETUP.md               # 详细安装指南 📚
├── tauri-migration-guide.md    # 迁移指南
└── README_TAURI.md              # 本文件
```

---

## 🎮 使用示例

### PC 端开发模式

```bash
npm run tauri:dev
```

![Tauri Dev](https://via.placeholder.com/800x400?text=Tauri+Dev+Mode)

### 移动端调试

```bash
# Android
npm run tauri:android:dev

# iOS (需要 macOS)
npm run tauri:ios:dev
```

### Cimbar 数据传输

**发送数据**:

1. 点击"数据传输"按钮
2. 选择"发送文件"
3. 选择文件（最大 33MB）
4. 屏幕显示动画二维码

**接收数据**:

1. 点击"数据传输"按钮
2. 选择"接收文件"
3. 摄像头对准发送设备屏幕
4. 自动保存接收的文件

---

## 📊 技术栈

### 前端

- **React 18**: UI 框架
- **Tailwind CSS 4**: 样式框架
- **Vite**: 构建工具

### 后端

- **Rust**: 系统编程语言
- **Tauri 2.0**: 跨平台框架
- **Argon2**: 密码哈希
- **AES-GCM**: 加密算法
- **TOTP**: 双因素认证

### 数据传输

- **libcimbar**: 高速二维码传输
- **WebAssembly**: WASM 运行时
- **Reed Solomon**: 纠错算法

---

## 🔧 配置说明

### Tauri 配置 (`tauri.conf.json`)

```json
{
  "productName": "Ciphora",
  "version": "1.3.0",
  "identifier": "com.ciphora.password-manager",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  }
}
```

### Android 权限 (`AndroidManifest.xml`)

- 📷 `CAMERA`: Cimbar 接收
- 💾 `WRITE_EXTERNAL_STORAGE`: 文件保存
- 🔒 `USE_BIOMETRIC`: 生物识别

### iOS 权限 (`Info.plist`)

- `NSCameraUsageDescription`: Cimbar 接收
- `NSPhotoLibraryUsageDescription`: 文件保存
- `NSFaceIDUsageDescription`: Face ID

---

## 🐛 常见问题

### Q: Rust 编译失败？

```bash
# 更新 Rust
rustup update

# 清理缓存
cargo clean
```

### Q: Android 构建失败？

```bash
# 检查环境变量
echo $ANDROID_HOME

# 清理 Gradle
cd src-tauri/gen/android
./gradlew clean
```

### Q: Cimbar WASM 未加载？

1. 检查文件是否存在: `public/wasm/cimbar.js` 和 `cimbar.wasm`
2. 检查浏览器控制台是否有错误
3. 确保在 HTTPS 或 localhost 运行

### Q: 相机权限被拒绝？

- **Android**: Settings > Apps > Ciphora > Permissions > Camera
- **iOS**: Settings > Ciphora > Camera
- **浏览器**: 地址栏左侧相机图标 > 允许

---

## 📚 文档链接

- 🔗 [Tauri 官方文档](https://v2.tauri.app/)
- 🔗 [libcimbar 项目](https://github.com/sz3/libcimbar)
- 🔗 [详细安装指南](./TAURI_SETUP.md)
- 🔗 [迁移指南](./tauri-migration-guide.md)

---

## 🎯 路线图

- [x] Tauri 2.0 迁移
- [x] libcimbar 集成
- [x] Android 支持
- [x] iOS 支持
- [x] 移动端 UI 优化
- [ ] 生物识别登录
- [ ] 云同步（可选）
- [ ] 浏览器扩展
- [ ] 桌面小组件

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🎉 致谢

- [Tauri](https://tauri.app/) - 强大的跨平台框架
- [libcimbar](https://github.com/sz3/libcimbar) - 创新的二维码技术
- [Rust](https://www.rust-lang.org/) - 安全可靠的系统语言

---

**准备好了吗？开始使用 Ciphora！** 🚀

```bash
npm run tauri:dev
```
