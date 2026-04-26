# 贡献指南

感谢您对 Ciphora 项目的关注！我们欢迎所有形式的贡献。

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请通过 [GitHub Issues](https://github.com/loganchef/Ciphora/issues) 报告，并提供尽可能详细的复现步骤和环境信息（操作系统、Ciphora 版本）。

### 代码贡献

1. Fork 本仓库。
2. 基于 `v2` 分支创建您的特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交您的更改并确保遵循 [提交规范](#提交规范)。
4. 推送到您的 Fork 仓库并开启一个 Pull Request。

## 开发环境设置

Ciphora 基于 **Tauri 2.0 (Rust)** 和 **React (Vite)** 构建。

```bash
# 1. 克隆仓库
git clone https://github.com/loganchef/Ciphora.git
cd Ciphora

# 2. 安装 Node.js 依赖
npm install

# 3. 运行开发模式 (桌面端)
npm run tauri:dev

# 4. 运行 Android 模式 (需要 Android Studio 环境)
npm run tauri:android:dev
```

*注意：环境准备请参考 [Tauri 官方先决条件指南](https://tauri.app/start/prerequisites/)*。

## 提交规范

我们遵循约定式提交 (Conventional Commits) 规范：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `style:` 代码格式调整（不影响逻辑）
- `refactor:` 代码重构
- `perf:` 性能优化
- `chore:` 构建过程或辅助工具的变动

## 代码风格

- 后端：遵循 `cargo fmt`。
- 前端：使用 ESLint 和 Prettier 保持一致性。
- 命名：前端采用驼峰式 (`camelCase`)，后端采用蛇形式 (`snake_case`)。

---
**Made with ❤️ by loganchef**
