# Ciphora - 安全密码管理器

<div align="center">
  <img src="./res/logo.png" alt="Ciphora Logo" width="120" height="120">
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/loganchef/Ciphora)
  [![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/loganchef/Ciphora)
</div>

## 📖 项目简介

Ciphora 是一个开源、安全、跨平台的密码管理器，基于 Electron 和 React 构建。它提供了强大的密码管理功能，支持多种数据类型存储、加密备份、多因素认证等企业级安全特性。

**主要优势：**
- 🔐 企业级安全加密
- 📱 多数据类型支持
- 🔄 自动备份恢复
- 🎨 现代化用户界面

## 📋 项目信息

| 🏢 开发组织 | 👨‍💻 开发人员 | 📧 联系邮箱 |
|-------------|---------------|-------------|
| [binrchq](https://github.com/binrchq) | [loganchef](https://github.com/loganchef) | [cubo@binrc.com](mailto:cubo@binrc.com) |

### 🖼️ 界面展示

<div align="center">

#### 🎨 界面展示


<div style="flex: 1; text-align: center;">
  <img src="./readme_res/d793f7c0-259d-4901-8a9a-3f428743a0ba.png" alt="登录界面" style="width: 100%; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</div>

<div style="flex: 1; text-align: center;">
  <img src="./readme_res/41ae95d8-944c-48d6-b360-b5314f80b422.png" alt="密码管理" style="width: 100%; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</div>

<div style="flex: 1; text-align: center;">
  <img src="./readme_res/e4cab2de-bcb0-4d33-865a-814290f05c9d.png" alt="控制面板" style="width: 100%; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</div>

<div style="flex: 1; text-align: center;">
  <img src="./readme_res/38fe97b6-a6b3-4991-bc0a-6fc6fdf8ff9e.png" alt="设置界面" style="width: 100%; border-radius: 5px; box-shadow: 0 15px 40px rgba(0,0,0,0.2);">
</div>

</div>

### ✨ 主要特性

| 功能 | 描述 |
|------|------|
| 🔐 **安全加密** | 采用 AES-256 加密算法保护您的数据 |
| 🎯 **多数据类型** | 支持密码、Base64、笔记、TOTP、Json 等多种数据类型 |
| 🔄 **自动备份** | 支持加密备份和恢复功能 |
| 📱 **多因素认证** | 内置 TOTP 支持，增强账户安全 |
| 🎨 **现代界面** | 基于 Tailwind CSS 的美观用户界面 |
| 🔍 **智能搜索** | 快速查找和管理您的密码 |
| 📊 **密码生成器** | 可自定义的强密码生成工具 |
| 🔒 **自动锁定** | 可配置的空闲自动锁定功能 |
| 📤 **导入导出** | 支持多种格式的数据导入导出 |

## 🚀 快速开始

### 系统要求

- Windows 10/11
- macOS 10.14+
- Linux (Ubuntu 18.04+)

### 安装方法

#### 方法一：下载预编译版本

1. 访问 [Releases](https://github.com/loganchef/Ciphora/releases) 页面
2. 下载适合您操作系统的安装包
3. 运行安装程序

#### 方法二：从源码构建

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

# 构建特定平台
yarn build:win    # Windows
yarn build:mac    # macOS  
yarn build:linux  # Linux
```

## 📱 使用指南

### 首次设置

1. **启动应用**：首次运行时会显示设置向导
2. **创建主密码**：设置一个强密码作为主密钥
3. **备份恢复码**：保存好恢复码，以防忘记主密码
4. **完成设置**：开始使用 Ciphora

### 基本功能

#### 添加密码
1. 点击"添加密码"按钮
2. 填写网站、用户名、密码等信息
3. 选择数据类型（密码、信用卡、笔记等）
4. 保存到保险库

#### 管理密码
- **查看**：点击密码项查看详细信息
- **编辑**：修改密码或相关信息
- **删除**：移除不需要的密码项
- **复制**：快速复制密码到剪贴板

#### 搜索功能
- 使用搜索框快速查找密码
- 支持按网站名、用户名等搜索
- 实时搜索结果

### 高级功能

#### 密码生成器
- 自定义密码长度（4-128位）
- 选择字符类型（大小写、数字、符号）
- 排除相似字符选项
- 自定义字符集

#### 多因素认证 (MFA)
1. 在设置中启用 MFA
2. 扫描二维码添加 TOTP 应用
3. 保存备份码
4. 登录时输入验证码

#### 数据备份
- **创建备份**：设置密码保护备份文件
- **恢复备份**：从备份文件恢复数据
- **自动备份**：可配置定期自动备份

#### 导入导出
支持多种格式：
- **导入**：Excel (.xlsx)、CSV (.csv)、Ciphora 备份 (.ciphora)
- **导出**：Excel、CSV、Ciphora 备份格式

## ⚙️ 设置选项

### 安全设置
| 功能 | 默认值 | 说明 |
|------|--------|------|
| **自动锁定** | 30分钟 | 空闲后自动锁定应用 |
| **隐藏敏感按钮** | 开启 | 隐藏删除等危险操作按钮 |
| **显示密码强度** | 开启 | 密码输入时显示强度指示器 |

### 密码生成器设置
| 功能 | 默认值 | 说明 |
|------|--------|------|
| **默认长度** | 16位 | 设置默认生成密码长度 |
| **字符选项** | 全选 | 配置包含的字符类型 |
| **排除相似字符** | 开启 | 排除容易混淆的字符（0O1lI） |

### 界面设置
| 功能 | 默认值 | 说明 |
|------|--------|------|
| **主题** | 系统 | 系统、浅色、深色主题 |
| **紧凑模式** | 关闭 | 减少界面间距 |
| **隐藏敏感按钮** | 开启 | 默认开启，提高安全性 |

## 🔒 安全特性

### 加密机制
| 项目 | 技术 | 说明 |
|------|------|------|
| **主密码** | PBKDF2 | 使用 PBKDF2 派生密钥 |
| **数据加密** | AES-256-GCM | AES-256-GCM 加密算法 |
| **安全存储** | 本地加密 | 本地加密存储，不上传云端 |

### 数据存储位置
| 平台 | 路径 | 说明 |
|------|------|------|
| **Windows** | `%APPDATA%/Ciphora/` | 应用数据目录 |
| **macOS** | `~/Library/Application Support/Ciphora/` | 应用支持目录 |
| **Linux** | `~/.config/Ciphora/` | 配置文件目录 |

**数据安全保障：**
- ✅ 应用更新时数据不会丢失
- ✅ 符合各操作系统的数据存储规范
- ✅ 具有适当的权限控制

### 忘记主密码的解决方案

如果您忘记了主密码，Ciphora 提供了数据重置功能：

#### 方法一：登录界面重置（推荐）
1. **在登录界面**点击 **"忘记主密码？"**
2. **输入确认文本** `RESET ALL DATA`
3. **二次确认操作**

#### 方法二：设置页面重置
1. **进入设置页面** → **危险区域**
2. **点击"重置所有数据"**
3. **输入确认文本** `RESET ALL DATA`
4. **二次确认操作**

⚠️ **重要提醒**：
- 此操作将**永久删除**所有密码数据和设置
- 操作**无法撤销**
- 这是忘记主密码时的**唯一解决方案**
- 建议在重置前尝试回忆主密码
- 重置后需要重新设置主密码和导入数据

### 安全最佳实践
- 使用强主密码并妥善保管
- 定期备份数据到安全位置
- 启用多因素认证
- 及时更新应用版本
- 考虑将主密码记录在安全的地方

## 🛠️ 开发指南

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | React 18 + Tailwind CSS | 现代化用户界面 |
| **后端** | Node.js + Electron | 跨平台桌面应用 |
| **加密** | crypto-js | 数据安全保护 |
| **构建** | Vite + Electron Builder | 快速构建打包 |

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

### 开发命令
```bash
# 开发模式
yarn dev

# 构建应用
yarn build

# 构建特定平台
yarn build:win    # Windows
yarn build:mac    # macOS
yarn build:linux  # Linux

# 代码检查
yarn lint
```

## 🤝 贡献指南

我们欢迎社区贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献类型
- 🐛 Bug 修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX 优化
- 🔧 性能优化

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目：
- [Electron](https://electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Heroicons](https://heroicons.com/) - 图标库

## 📞 支持与反馈

- 🐛 **Bug 报告**：[Issues](https://github.com/loganchef/Ciphora/issues)
- 💡 **功能建议**：[Discussions](https://github.com/loganchef/Ciphora/discussions)
- 📧 **联系邮箱**：[cubo@binrc.com](mailto:cubo@binrc.com)

## 💝 支持项目

如果 Ciphora 对您有帮助，欢迎支持我们的开发工作：

### 支持等级
| 等级 | 金额 | 说明 |
|------|------|------|
| 🌸 一朵花 | ¥1 | 小小的鼓励 |
| 🍋 柠檬水 | ¥5 | 清爽的提神 |
| 🧋 奶茶 | ¥12 | 甜蜜的享受 |
| 🍽️ 午饭 | ¥25 | 丰盛的午餐 |
| 🎯 自定义 | ¥? | 随心所欲 |

### 支付方式

| 微信支付 | 支付宝 |
|----------|--------|
| <img src="./res/wechatpay.png" alt="微信支付" width="150" height="170"><br>**微信支付** | <img src="./res/alipay.png" alt="支付宝" width="150" height="170"><br>**支付宝** |

> 💡 感谢您的支持！每一份支持都是我们继续完善的动力。

---

<div align="center">

**Made with ❤️ by [loganchef](https://github.com/loganchef)**

📧 **Contact**: [cubo@binrc.com](mailto:cubo@binrc.com)

⭐ **Star this repository if you like it!**

</div>