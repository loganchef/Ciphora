<div align="center">
  <img src="./res/logo.png" alt="Ciphora" width="100" height="100">
  <h1>Ciphora</h1>
  <p>零知识密码管理器 · 本地优先 · 离线气隙传输</p>
  <p>
    <img src="https://img.shields.io/badge/版本-2.0.0-blue.svg?style=flat-square">
    <img src="https://img.shields.io/badge/后端-Rust%20%2B%20Tauri%202.0-orange.svg?style=flat-square">
    <img src="https://img.shields.io/badge/前端-React%2018-61dafb.svg?style=flat-square">
    <img src="https://img.shields.io/badge/协议-MIT-yellow.svg?style=flat-square">
    <img src="https://img.shields.io/badge/平台-Windows%20|%20macOS%20|%20Linux%20|%20Android%20|%20iOS-lightgrey.svg?style=flat-square">
    <img src="https://img.shields.io/github/stars/loganchef/Ciphora?style=flat-square">
  </p>
  <p>
    <a href="https://github.com/loganchef/Ciphora/releases">📦 下载</a> ·
    <a href="https://www.bilibili.com/video/BV1B61ZBgEDb/">🎬 演示视频</a> ·
    <a href="https://github.com/loganchef/Ciphora/issues">🐛 问题反馈</a> ·
    <a href="https://github.com/loganchef/Ciphora/wiki">📖 文档</a> ·
    <a href="./README.md">🇺🇸 English</a>
  </p>
</div>

---

## 💖 支持这个项目

Ciphora 由一位独立开发者利用业余时间独立开发和维护。没有风险投资，没有订阅费，没有广告，没有遥测数据上报。这是有意为之的 —— **你的数据，永远不应该成为别人的商业模式。**

如果 Ciphora 保护了你的密码、帮你避开了一次数据泄露，或者只是让你的数字生活少了一点烦恼 —— 请考虑赞助支持。哪怕是一杯咖啡，也能让这个项目继续走下去，也是在告诉我：这样的软件值得被做出来。

<div align="center">

[<img src="https://img.shields.io/badge/❤️_GitHub_Sponsors-ea4aaa?style=for-the-badge&logo=github" />](https://github.com/sponsors/loganchef)

</div>

也支持微信和支付宝：

|                      微信支付                      |                     支付宝                      |
| :------------------------------------------------: | :---------------------------------------------: |
| <img src="./readme_res/wechatpay.png" width="200"> | <img src="./readme_res/alipay.png" width="200"> |

赞助后在 [Issues](https://github.com/loganchef/Ciphora/issues) 留言，我会把你加入名单 ✨

### 🌟 赞助者

感谢这些人让 Ciphora 成为可能。

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

---

## 截图

<div align="center">
  <table>
    <tr>
      <td><img src="./readme_res/d793f7c0-259d-4901-8a9a-3f428743a0ba.png" width="380" style="border-radius:8px"></td>
      <td><img src="./readme_res/41ae95d8-944c-48d6-b360-b5314f80b422.png" width="380" style="border-radius:8px"></td>
    </tr>
    <tr>
      <td align="center"><sub>安全登录</sub></td>
      <td align="center"><sub>密码库管理</sub></td>
    </tr>
    <tr>
      <td><img src="./readme_res/e4cab2de-bcb0-4d33-865a-814290f05c9d.png" width="380" style="border-radius:8px"></td>
      <td><img src="./readme_res/38fe97b6-a6b3-4991-bc0a-6fc6fdf8ff9e.png" width="380" style="border-radius:8px"></td>
    </tr>
    <tr>
      <td align="center"><sub>主界面</sub></td>
      <td align="center"><sub>设置</sub></td>
    </tr>
  </table>
</div>

---

## Ciphora 是什么

大多数密码管理器要你把最敏感的数据托付给他们 —— 然后同步到他们的服务器、把功能锁在付费墙后面，隐私政策随时可能悄悄更新。

Ciphora 走的是完全相反的路。

**你的密码库永远不会离开你的设备。** 没有云端，没有同步服务器，不需要注册账号。所有数据在本地加密，使用只有你能推导出的密钥，通过摄像头传输到其他设备 —— 而不是互联网。

除了密码，Ciphora 还能存储 TOTP/MFA 验证码、Base64 附件、JSON 结构体和自由格式备注 —— 全部在同一个加密库里。不再需要为密码、验证码、加密笔记分别打开三个 App。

所有加密操作由 Rust 编写，运行在独立的 Tauri 沙箱中。React 前端对密钥、明文和文件系统没有任何访问权限。

---

## 为什么选 Ciphora

密码管理器有很多，以下是 Ciphora 与主流产品的实际对比：

|                             |   Ciphora   |  Bitwarden  | 1Password | KeePass |
| --------------------------- | :---------: | :---------: | :-------: | :-----: |
| 开源                        |     ✅      |     ✅      |    ❌     |   ✅    |
| 真正纯本地（无需服务器）    |     ✅      |  ⚠️ 需自建  |    ❌     |   ✅    |
| 气隙设备同步                |  ✅ Cimbar  |     ❌      |    ❌     |   ❌    |
| 内置 TOTP/MFA               |   ✅ 免费   |   💰 付费   |  💰 付费  | 仅插件  |
| Rust 加密后端               |     ✅      |     ❌      |    ❌     |   ❌    |
| 安装包大小                  | **< 10 MB** |   ~80 MB    |  ~100 MB  |  ~5 MB  |
| iOS + Android（同一套代码） |     ✅      |     ✅      |    ✅     |   ❌    |
| 永久免费                    |     ✅      | ⚠️ 功能受限 |    ❌     |   ✅    |

一句话：如果你想要一个**真正无法回传数据**（因为根本没有服务器）、加密层用内存安全语言编写、完全离线可用的密码管理器 —— Ciphora 就是为此而生的。

---

## 安全架构

```
主密码
  │
  ▼
PBKDF2-HMAC-SHA256  ←  设备唯一盐值
  │
  ▼
AES-256-GCM 密钥
  │
  ├──► 加密密码库 → 本地存储
  └──► 使用后立即从内存清零

主密码从不落盘 · 数据永不离开你的设备
```

- **密钥派生** —— PBKDF2-HMAC-SHA256 配合设备唯一盐值，抵御彩虹表和跨设备预计算攻击。
- **对称加密** —— AES-256-GCM 同时保障机密性与完整性。任何对库文件的篡改都会在下次解锁时被检测到。
- **零知识验证** —— 主密码仅与存储的哈希值比对，原始密码从不以任何形式持久化或传输。
- **内存隔离** —— Tauri 沙箱阻止前端 JavaScript 访问文件系统、加密句柄或任何派生密钥材料。密钥在使用后立即从内存显式清零。

---

## 功能特性

| 功能                   | 说明                                                        |
| ---------------------- | ----------------------------------------------------------- |
| 🛡️ **真正零知识**      | 密钥在内存中派生，用后清零。明文永不接触磁盘。              |
| 📡 **Cimbar 离线传输** | 通过摄像头将完整密码库同步到另一台设备，无需任何网络。      |
| 🧩 **多类型数据**      | 密码、TOTP/MFA、Base64、JSON、备注 —— 一个加密库存储一切。  |
| 🔐 **内置 MFA**        | 原生 TOTP 生成与验证，无需第三方验证器 App。                |
| 📂 **分组管理**        | 自定义图标分组，批量移动、排序与整理。                      |
| 📤 **导入 / 导出**     | 支持 JSON 和 CSV，兼容 1Password、Bitwarden、KeePass 等。   |
| 📱 **全平台覆盖**      | Windows、macOS、Linux、Android、iOS —— 一套代码，原生体验。 |
| 🌐 **国际化**          | 中英文完整支持，自动识别系统语言，欢迎 PR 贡献更多语言。    |
| ⚡ **高性能**          | 二进制序列化，万条记录毫秒级解锁与搜索。                    |
| 🪶 **极度轻量**        | 安装包不足 10 MB，基于 Tauri 而非 Electron，内存占用极低。  |

---

## 📡 Cimbar 离线传输

<div align="center">
  <table>
    <tr>
      <td><img src="./readme_res/image.png" width="420" style="border-radius:8px"></td>
      <td><img src="./readme_res/cimbar-bm.gif" width="290" style="border-radius:8px"></td>
    </tr>
    <tr>
      <td align="center"><sub>传输界面</sub></td>
      <td align="center"><sub>动态流演示 —— BM 模式</sub></td>
    </tr>
  </table>
</div>

Ciphora 集成了 [Cimbar（彩色图标矩阵条码）](https://github.com/sz3/libcimbar) 协议，实现气隙设备间的数据同步。

**普通二维码最多存几百字节。** Cimbar 使用喷泉码（Fountain Codes）将整个加密库序列化为连续视频流 —— 没有容量上限，无需将库文件拆分传输。

**丢帧不会中断传输。** 解码器可从接收到的任意足够多的帧中重建原始文件。短暂移开摄像头没关系，继续扫描即可接着上次进度。

**视频流本身不泄露任何信息。** 传输完全离线进行。结合强制要求的分享密码级联加密，即使有人录制了整个传输过程，你的数据依然安全。

> 基于 [sz3](https://github.com/sz3) 的 [libcimbar](https://github.com/sz3/libcimbar) 实现，深深感谢他对开源社区的贡献。

---

## 技术栈

| 层级        | 技术                                                |
| ----------- | --------------------------------------------------- |
| 核心 / 加密 | Rust 1.75+，Tauri 2.0                               |
| 加密库      | `aes-gcm`、`argon2`、`sha2`、`rand`                 |
| 前端        | React 18、Vite 7、Tailwind CSS 4、Heroicons、Lucide |
| 国际化      | i18next（UI 与 Rust 后端双栈）                      |
| MFA         | `speakeasy` / `totp-lite` 实现 TOTP                 |
| 移动端      | Kotlin（Android）、Swift（iOS）经由 Tauri Bridge    |

---

## 快速开始

### 下载安装

从 [Releases](https://github.com/loganchef/Ciphora/releases) 下载对应平台的安装包：

| 平台                | 文件                       |
| ------------------- | -------------------------- |
| Windows x64         | `Ciphora_*_x64-setup.exe`  |
| Windows x86         | `Ciphora_*_x86-setup.exe`  |
| macOS Apple Silicon | `Ciphora_*_aarch64.dmg`    |
| macOS Intel         | `Ciphora_*_x64.dmg`        |
| Linux               | `Ciphora_*_amd64.AppImage` |
| Android             | `Ciphora_*.apk`            |

### 从源码构建

**环境要求**：Node.js 18+、Rust 1.75+、[Tauri 前置依赖](https://tauri.app/start/prerequisites/)

```bash
git clone https://github.com/loganchef/Ciphora.git
cd Ciphora
npm install

# 桌面端
npm run tauri:dev           # 开发模式（热重载）
npm run tauri:build         # 生产构建

# Android
npm run tauri:android:init
npm run tauri:android:build

# iOS（需要 macOS + Xcode）
npm run tauri:ios:init
npm run tauri:ios:build
```

---

## 开发计划

以下是正在规划或推进中的功能。关注 Releases 跟踪进展。

- [ ] 浏览器扩展（自动填充）
- [ ] Yubikey / 硬件密钥支持
- [ ] 密码库历史记录与非破坏性编辑
- [ ] 带密码保护的加密导出（ZIP）
- [ ] 更多语言支持（欢迎贡献）
- [ ] 紧急访问 / 可信联系人解锁

有功能需求？[提交 Issue](https://github.com/loganchef/Ciphora/issues) —— 社区反馈直接影响开发优先级。

---

## 常见问题

**设备丢失后数据还安全吗？**

库文件使用 AES-256-GCM 加密，密钥由主密码派生。没有密码，任何人都无法打开文件，包括你自己。建议将库文件备份到物理安全的地方，但即使备份被别人拿到，没有主密码也打不开。

**忘记主密码怎么办？**

没有任何找回机制，这是设计决策。零知识意味着不存在可以帮你重置权限的服务器。请将主密码写在纸上，存放在物理安全的地方（保险箱、密封信封等）。

**不用 Cimbar 可以跨设备同步吗？**

可以。你可以通过 USB、局域网共享、AirDrop 或任何你信任的方式手动复制库文件。Cimbar 是为那些想完全绕开任何文件传输基础设施的场景而设计的内置方案。

**为什么用 Rust 而不是 JS 加密库？**

JavaScript 运行时在密钥管理上有公认的缺陷 —— 垃圾回收不保证内存清零，运行时环境本身暴露面更大。Rust 提供显式内存控制、析构时自动 `zeroize`，以及加密操作与 UI 层之间的硬沙箱边界。

**移动端和桌面端是同一套代码吗？**

是的。Ciphora 使用 Tauri 的移动端桥接，Rust 加密核心和 React 前端在所有平台复用。Android 和 iOS 与桌面端功能完全一致，没有独立的开发分支。

---

## 参与贡献

欢迎提交 Pull Request。

- **Bug 修复和翻译** —— 可直接提交 PR
- **新功能** —— 请先开 Issue 对齐方向，再开始开发
- **安全问题** —— 请通过 [GitHub Security Advisories](https://github.com/loganchef/Ciphora/security/advisories) 私下报告

---

## 开源协议

[MIT License](./LICENSE) · Copyright © 2025 Ciphora

<div align="center">
  <br>
  <b>用 ❤️ 制作，by <a href="https://github.com/loganchef">loganchef</a></b><br>
  <sub>如果 Ciphora 对你有帮助，点一个 ⭐ 是最好的免费支持。</sub>
</div>
