#!/bin/bash

# Ciphora 全自动发布脚本
# 使用方法: ./scripts/release.sh <新版本号>
# 示例: ./scripts/release.sh 2.0.11

set -e

if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供版本号"
    echo "用法: $0 <版本号>"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 开始准备发布 Ciphora $TAG (当前分支: $CURRENT_BRANCH)"

# 检查工作区
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ 警告: 工作目录不干净，正在自动暂存..."
    git add .
fi

# 1. 更新 package.json
echo "📝 更新 package.json..."
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. 更新 Cargo.toml (第一行出现的 version)
echo "📝 更新 src-tauri/Cargo.toml..."
sed -i "0,/version = \".*\"/s//version = \"$VERSION\"/" src-tauri/Cargo.toml

# 3. 更新 tauri.conf.json
echo "📝 更新 src-tauri/tauri.conf.json..."
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

# 4. 执行版本更新辅助脚本 (更新 UI 中的版本文字)
if [ -f "scripts/update-version.js" ]; then
    echo "📝 执行 update-version.js..."
    node scripts/update-version.js $VERSION
fi

# 5. 提交并打标签
echo "💾 提交更改并创建标签 $TAG..."
git add .
git commit -m "chore: release $TAG" || echo "没有可提交的内容"
git tag -a "$TAG" -m "Release $TAG"

echo ""
echo "✅ 本地准备完成!"
echo "--------------------------------------"
echo "下一步请执行以下命令推送云端构建:"
echo "git push origin $CURRENT_BRANCH && git push origin $TAG"
echo "git push github $CURRENT_BRANCH && git push github $TAG"
echo "--------------------------------------"
