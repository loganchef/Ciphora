#!/bin/bash
# Ciphora Tauri 2.0 自动安装脚本（macOS/Linux）

echo "🚀 开始设置 Ciphora Tauri 2.0 环境..."

# 检查 Node.js
echo ""
echo "📦 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js 已安装: $NODE_VERSION"
else
    echo "❌ 未找到 Node.js，请先安装: https://nodejs.org/"
    exit 1
fi

# 检查 Rust
echo ""
echo "🦀 检查 Rust..."
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo "✅ Rust 已安装: $RUST_VERSION"
else
    echo "⚠️  未找到 Rust，正在安装..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo "✅ Rust 安装完成"
fi

# 检查系统依赖（Linux）
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo ""
    echo "🔧 检查系统依赖..."
    
    if command -v apt &> /dev/null; then
        echo "检测到 Ubuntu/Debian 系统"
        echo "安装系统依赖..."
        sudo apt update
        sudo apt install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev
        echo "✅ 系统依赖安装完成"
    elif command -v dnf &> /dev/null; then
        echo "检测到 Fedora 系统"
        echo "安装系统依赖..."
        sudo dnf install -y \
            webkit2gtk4.1-devel \
            openssl-devel \
            curl \
            wget \
            file \
            libappindicator-gtk3-devel \
            librsvg2-devel
        echo "✅ 系统依赖安装完成"
    else
        echo "⚠️  无法自动安装系统依赖，请手动安装"
        echo "参考文档: https://v2.tauri.app/start/prerequisites/"
    fi
fi

# 检查 Xcode（macOS）
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🍎 检查 Xcode Command Line Tools..."
    if xcode-select -p &> /dev/null; then
        echo "✅ Xcode Command Line Tools 已安装"
    else
        echo "⚠️  正在安装 Xcode Command Line Tools..."
        xcode-select --install
        echo "请完成安装后重新运行此脚本"
        exit 0
    fi
fi

# 安装 Node.js 依赖
echo ""
echo "📦 安装 Node.js 依赖..."
npm install

# 安装 Tauri CLI
echo ""
echo "🔧 安装 Tauri 依赖..."
npm install --save-dev @tauri-apps/cli@next
npm install @tauri-apps/api@next \
    @tauri-apps/plugin-fs@next \
    @tauri-apps/plugin-dialog@next \
    @tauri-apps/plugin-shell@next

# 检查 libcimbar WASM
echo ""
echo "📊 检查 libcimbar WASM 文件..."
WASM_DIR="public/wasm"
CIMBAR_JS="$WASM_DIR/cimbar.js"
CIMBAR_WASM="$WASM_DIR/cimbar.wasm"

mkdir -p "$WASM_DIR"

if [[ -f "$CIMBAR_JS" ]] && [[ -f "$CIMBAR_WASM" ]]; then
    echo "✅ libcimbar WASM 文件已存在"
else
    echo "⚠️  libcimbar WASM 文件未找到"
    echo "请从以下地址下载并放入 public/wasm/ 目录："
    echo "  1. https://cimbar.org (推荐)"
    echo "  2. https://github.com/sz3/libcimbar/releases"
    echo ""
    echo "详细说明请查看: public/wasm/README.md"
fi

# 完成
echo ""
echo "✅ 安装完成！"
echo ""
echo "🎯 下一步："
echo "  1. 下载 libcimbar WASM 文件（如果还没有）"
echo "  2. 运行开发服务器: npm run tauri:dev"
echo "  3. 构建应用: npm run tauri:build"
echo ""
echo "📚 详细文档: TAURI_SETUP.md"
echo ""
echo "🎉 开始使用 Ciphora！"




