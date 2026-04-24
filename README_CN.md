<div align="center">
  <img src="./res/logo.png" alt="Ciphora Logo" width="120" height="120">

  <h1>Ciphora</h1>

  <p><strong>零知识架构 · 跨平台原生 · 工业级加密</strong></p>

  <p>
    <img src="https://img.shields.io/badge/版本-2.0.0-blue.svg?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/许可证-MIT-yellow.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/平台-Windows%20|%20macOS%20|%20Linux%20|%20Android%20|%20iOS-lightgrey.svg?style=flat-square" alt="Platform">
    <img src="https://img.shields.io/badge/后端-Rust-orange.svg?style=flat-square" alt="Backend">
    <img src="https://img.shields.io/badge/前端-React%2018-61dafb.svg?style=flat-square" alt="Frontend">
    <img src="https://img.shields.io/github/stars/loganchef/Ciphora?style=flat-square" alt="Stars">
  </p>

  <p>
    <a href="https://github.com/loganchef/Ciphora/releases">📦 下载</a> ·
    <a href="https://www.bilibili.com/video/BV1B61ZBgEDb/">🎬 视频演示</a> ·
    <a href="https://github.com/loganchef/Ciphora/issues">🐛 报告问题</a> ·
    <a href="https://github.com/loganchef/Ciphora/wiki">📖 文档</a> ·
    <a href="./README.md">🇺🇸 English</a>
  </p>
</div>

---

## 💖 赞助支持

> Ciphora 完全免费、永久开源。如果它帮到了你，请考虑赞助——哪怕一杯咖啡，都是对独立开发者最直接的鼓励。

<div align="center">

[<img src="https://img.shields.io/badge/❤️_GitHub_Sponsor-ea4aaa?style=for-the-badge&logo=github" />](https://github.com/sponsors/loganchef)

<br>

| 微信支付 | 支付宝 |
|:---:|:---:|
| <img src="./readme_res/wechatpay.png" width="200"> | <img src="./readme_res/alipay.png" width="200"> |

</div>

### 🌟 赞助人名单

感谢以下朋友对 Ciphora 的支持，你们让这个项目得以持续进化：

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/sponsors/loganchef">
        <img src="./readme_res/sponsors/1764307417756.jpg" width="52" height="52" style="border-radius:50%"><br>
        <sub><b>悟吉</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/sponsors/loganchef">
        <img src="https://avatars.githubusercontent.com/u/583231?v=4" width="52" height="52" style="border-radius:50%"><br>
        <sub><b>你的名字</b></sub>
      </a>
    </td>
  </tr>
</table>

> 赞助后请在 [Issues](https://github.com/loganchef/Ciphora/issues) 留言，我会将你加入名单 ✨

---

## 界面展示

<div align="center">
  <table>
    <tr>
      <td><img src="./readme_res/d793f7c0-259d-4901-8a9a-3f428743a0ba.png" width="380" style="border-radius:10px"></td>
      <td><img src="./readme_res/41ae95d8-944c-48d6-b360-b5314f80b422.png" width="380" style="border-radius:10px"></td>
    </tr>
    <tr>
      <td align="center"><i>安全登录</i></td>
      <td align="center"><i>密库管理</i></td>
    </tr>
    <tr>
      <td><img src="./readme_res/e4cab2de-bcb0-4d33-865a-814290f05c9d.png" width="380" style="border-radius:10px"></td>
      <td><img src="./readme_res/38fe97b6-a6b3-4991-bc0a-6fc6fdf8ff9e.png" width="380" style="border-radius:10px"></td>
    </tr>
    <tr>
      <td align="center"><i>控制面板</i></td>
      <td align="center"><i>高级设置</i></td>
    </tr>
  </table>
</div>

---

## 项目简介

Ciphora 是一款基于 **Tauri 2.0 + Rust** 构建的开源密码管理器。不依赖任何云服务，所有数据加密后仅存储在你的设备本地。

与同类工具相比，Ciphora 的差异化在于：

- **真正的零知识**：主密码永不落盘，加密密钥在内存中派生、用完即销毁
- **Cimbar 离线传输**：无需网络，通过摄像头扫描二维码流即可跨设备同步整个密库
- **多维数据类型**：不只是密码——支持 MFA 密钥、Base64 附件、JSON 结构体、自由笔记
- **极致轻量**：Tauri 架构，安装包 < 10MB，内存占用远低于 Electron 同类应用

---

## 核心特性

| 特性 | 说明 |
|------|------|
| 🛡️ **原生安全** | Rust 后端处理全部加密逻辑，前端 JS 无法触及密钥或明文 |
| 📱 **全平台** | Windows / macOS / Linux / Android / iOS，一套代码库 |
| 📡 **Cimbar 传输** | 基于喷泉码的视频流二维码，断网环境下大数据量跨设备同步 |
| 🧩 **多维数据** | 密码、MFA、Base64、JSON、笔记，统一管理 |
| 🔐 **MFA 内置** | 原生 TOTP 生成与验证，无需第三方 Authenticator |
| 📂 **分组管理** | 自定义分组 + 图标，支持批量移动与排序 |
| 📤 **导入导出** | 支持 JSON / CSV，兼容主流密码管理器格式 |
| 🌐 **国际化** | 中英文完整适配，自动跟随系统语言 |
| ⚡ **高性能** | 二进制序列化存储，万条记录毫秒级响应 |

---

## 安全架构

```
主密码
  │
  ▼
PBKDF2-HMAC-SHA256（高迭代 + 设备唯一盐值）
  │
  ▼
AES-256-GCM 密钥
  │
  ├──► 加密密库数据 → 本地存储
  └──► 使用后立即从内存清零

主密码永不明文存储 · 数据永不离开设备
```

- **密钥派生**：PBKDF2-HMAC-SHA256，设备唯一盐值，防彩虹表攻击
- **对称加密**：AES-256-GCM，同时保证机密性与完整性（防篡改）
- **零知识**：主密码哈希验证，原始密码不存储、不传输
- **内存隔离**：Tauri 沙箱，前端 JavaScript 无法访问系统文件或加密句柄

---

## 技术栈

| 层 | 技术 |
|----|------|
| 内核 / 加密 | Rust 1.75+, Tauri 2.0 |
| 前端渲染 | React 18, Vite 7 |
| 样式 | Tailwind CSS 4, Heroicons, Lucide |
| 国际化 | i18next（UI + 后端双栈） |
| MFA | TOTP（speakeasy / totp-lite） |
| 移动端 | Kotlin (Android), Swift (iOS) via Tauri Bridge |
| 加密库 | aes-gcm, argon2, sha2, rand (Rust) |

---

## 快速开始

### 直接下载

从 [Releases](https://github.com/loganchef/Ciphora/releases) 获取对应平台安装包：

| 平台 | 文件 |
|------|------|
| Windows x64 | `Ciphora_*_x64-setup.exe` |
| Windows x86 | `Ciphora_*_x86-setup.exe` |
| macOS Apple Silicon | `Ciphora_*_aarch64.dmg` |
| macOS Intel | `Ciphora_*_x64.dmg` |
| Linux | `Ciphora_*_amd64.AppImage` |
| Android | `Ciphora_*.apk` |

### 源码构建

**环境要求**：Node.js 18+，Rust 1.75+，[Tauri 前置依赖](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/loganchef/Ciphora.git
cd Ciphora

npm install

# 桌面开发模式
npm run tauri:dev

# 构建桌面发行版
npm run tauri:build

# 构建 Android
npm run tauri:android:init
npm run tauri:android:build

# 构建 iOS（需要 macOS + Xcode）
npm run tauri:ios:init
npm run tauri:ios:build
```

---

## 许可证

[MIT License](./LICENSE) · Copyright © 2025 Ciphora

<div align="center">
  <br>
  <b>Made with ❤️ by <a href="https://github.com/loganchef">loganchef</a></b>
  <br><br>
  <i>如果 Ciphora 对你有用，给个 ⭐ 是最好的支持。</i>
</div>
