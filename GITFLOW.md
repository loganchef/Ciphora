# Git 工作流程 (Git Flow)

## 概述

Ciphora 采用基于 `v2` (main) 分支的简化 Git Flow 流程。当推送版本 Tag 时，GitHub Actions 会自动触发云端构建并将安装包发布到 Releases。

## 分支结构

- **v2 (main)**: 生产环境分支。所有发布代码必须合并至此。
- **feature/*** : 新功能开发分支。
- **hotfix/*** : 紧急修复分支。

## 开发与发布流程

### 1. 功能开发

```bash
# 从 v2 创建特性分支
git checkout v2
git pull origin v2
git checkout -b feature/your-feature

# 开发完成后合并
git checkout v2
git merge feature/your-feature
```

### 2. 执行全自动发布

我们提供了一个强大的发布脚本 `scripts/release.sh`，它可以自动同步所有配置文件的版本号并打上 Git Tag。

```bash
# 示例：发布 v2.0.12
./scripts/release.sh 2.0.12
```

### 3. 推送至云端构建

脚本执行完成后，只需将代码和标签推送到 GitHub，CI 就会自动开始工作。

```bash
# 推送当前分支和最新生成的 Tag
git push origin v2 --tags
git push github v2 --tags
```

## 云端构建产物 (GitHub Actions)

成功推送 Tag 后，系统会自动生成以下安装包：
- **Windows**: `.exe` (NSIS), `.msi`
- **Android**: `.apk` (ARM64, x86_64 等)
- **macOS**: `.dmg` (Universal)
- **Linux**: `.AppImage`, `.deb`

## 版本号规范

遵循 [语义化版本 (SemVer)](https://semver.org/lang/zh-CN/):
- **X.0.0**: 架构调整或重大更新。
- **0.X.0**: 功能新增。
- **0.0.X**: 问题修复或文档优化。

---
**Made with ❤️ by loganchef**
