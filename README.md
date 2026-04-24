# Ciphora - 安全密码管理器

<div align="center">
  <img src="./res/logo.png" alt="Ciphora Logo" width="120" height="120">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/loganchef/Ciphora)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/loganchef/Ciphora)
</div>

## 赞助商或赞助者

Ciphora 是一个开源项目，其持续开发完全依赖于我们优秀赞助商的支持。如果您想加入他们，请考虑赞助 Ciphora 的开发。如何赞助，请点击[这里](readme_res/sponsors.md)。

<div align="left" style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start;">
  <div style="text-align: center;">
    <a href="https://github.com/sponsors/loganchef">
      <img src="./readme_res/sponsors/1764307417756.jpg" alt="赞助商" width="60" height="60" style="border-radius: 30%; object-fit: cover;">
      <br>
      <p style="margin-top: 3px; margin-bottom: 0;">悟吉</p>
    </a>
  </div>
</div>

## 项目简介

Ciphora 是一个开源、安全、跨平台的密码管理器，基于 Electron 和 React 构建。它提供了强大的密码管理功能，支持多种数据类型存储、加密备份、多因素认证等安全特性。

📺 **视频介绍**：[B 站视频](https://www.bilibili.com/video/BV1B61ZBgEDb/?vd_source=a280837cf751ff52b030acff3e79a6b1)

### 界面展示

<table>
<tr>
<td align="center" width="50%">
  <img src="./readme_res/d793f7c0-259d-4901-8a9a-3f428743a0ba.png" alt="登录界面" style="width: 100%; max-width: 500px; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</td>
<td align="center" width="50%">
  <img src="./readme_res/41ae95d8-944c-48d6-b360-b5314f80b422.png" alt="密码管理" style="width: 100%; max-width: 500px; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</td>
</tr>
<tr>
<td align="center" width="50%">
  <img src="./readme_res/e4cab2de-bcb0-4d33-865a-814290f05c9d.png" alt="控制面板" style="width: 100%; max-width: 500px; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</td>
<td align="center" width="50%">
  <img src="./readme_res/38fe97b6-a6b3-4991-bc0a-6fc6fdf8ff9e.png" alt="设置界面" style="width: 100%; max-width: 500px; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</td>
</tr>
</table>

## 主要特性

- **安全加密**：采用 AES-256-GCM 加密算法，使用 PBKDF2 派生密钥
- **多数据类型**：支持密码、Base64、笔记、TOTP、Json 等多种数据类型
- **自动备份**：支持加密备份和恢复功能
- **多因素认证**：内置 TOTP 支持
- **密码生成器**：可自定义的强密码生成工具
- **自动锁定**：可配置的空闲自动锁定功能
- **导入导出**：支持 Excel、CSV、Ciphora 备份格式

## 快速开始

### 系统要求

- Windows 10/11
- macOS 10.14+
- Linux (Ubuntu 18.04+)

### 安装方法

#### 下载预编译版本

访问 [Releases](https://github.com/loganchef/Ciphora/releases) 页面下载适合您操作系统的安装包。

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/loganchef/Ciphora.git
cd Ciphora

# 安装依赖
yarn install

# 开发模式运行
yarn dev

# 构建应用
yarn build
```

## 安全特性

### 加密机制

- **主密码**：PBKDF2 派生密钥
- **数据加密**：AES-256-GCM 加密算法
- **数据存储**：本地加密存储，不上传云端

### 数据存储位置

| 平台    | 路径                                     |
| ------- | ---------------------------------------- |
| Windows | `%APPDATA%/Ciphora/`                     |
| macOS   | `~/Library/Application Support/Ciphora/` |
| Linux   | `~/.config/Ciphora/`                     |

### 忘记主密码

如果忘记了主密码，可以在登录界面或设置页面的危险区域点击"忘记主密码"或"重置所有数据"，输入确认文本 `RESET ALL DATA` 进行重置。

⚠️ **注意**：此操作将永久删除所有数据且无法撤销。

## 开发指南

### 技术栈

- **前端**：React 18 + Tailwind CSS
- **后端**：Node.js + Electron
- **加密**：crypto-js
- **构建**：Vite + Electron Builder

### 项目结构

```
Ciphora/
├── src/                    # 前端源码
│   ├── components/        # React 组件
│   ├── lib/              # 工具库
│   └── index.jsx         # 入口文件
├── server/                # 后端服务
│   ├── services/         # 业务逻辑
│   ├── config/           # 配置文件
│   └── utils/            # 工具函数
├── res/                   # 资源文件
├── main.cjs              # Electron 主进程
└── preload.js            # 预加载脚本
```

## 贡献指南

欢迎社区贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持与反馈

- **Bug 报告**：[Issues](https://github.com/loganchef/Ciphora/issues)
- **功能建议**：[Discussions](https://github.com/loganchef/Ciphora/discussions)
- **联系邮箱**：[logan@binrc.com](mailto:logan@binrc.com)

---

<div align="center">

**Made with ❤️ by [loganchef](https://github.com/loganchef)**

</div>
