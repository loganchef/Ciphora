# Ciphora Tauri 2.0 自动安装脚本（Windows PowerShell）

Write-Host "🚀 开始设置 Ciphora Tauri 2.0 环境..." -ForegroundColor Cyan

# 检查 Node.js
Write-Host "`n📦 检查 Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到 Node.js，请先安装: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 检查 Rust
Write-Host "`n🦀 检查 Rust..." -ForegroundColor Yellow
if (Get-Command rustc -ErrorAction SilentlyContinue) {
    $rustVersion = rustc --version
    Write-Host "✅ Rust 已安装: $rustVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  未找到 Rust，正在安装..." -ForegroundColor Yellow
    Write-Host "请在新窗口中完成 Rust 安装，然后重新运行此脚本" -ForegroundColor Cyan
    Start-Process "https://www.rust-lang.org/tools/install"
    exit 0
}

# 安装 Node.js 依赖
Write-Host "`n📦 安装 Node.js 依赖..." -ForegroundColor Yellow
npm install

# 安装 Tauri CLI
Write-Host "`n🔧 安装 Tauri 依赖..." -ForegroundColor Yellow
npm install --save-dev @tauri-apps/cli@next
npm install @tauri-apps/api@next @tauri-apps/plugin-fs@next @tauri-apps/plugin-dialog@next @tauri-apps/plugin-shell@next

# 检查 libcimbar WASM
Write-Host "`n📊 检查 libcimbar WASM 文件..." -ForegroundColor Yellow
$wasmDir = "public\wasm"
$cimbarJs = Join-Path $wasmDir "cimbar.js"
$cimbarWasm = Join-Path $wasmDir "cimbar.wasm"

if (-not (Test-Path $wasmDir)) {
    New-Item -ItemType Directory -Path $wasmDir -Force | Out-Null
}

if ((Test-Path $cimbarJs) -and (Test-Path $cimbarWasm)) {
    Write-Host "✅ libcimbar WASM 文件已存在" -ForegroundColor Green
} else {
    Write-Host "⚠️  libcimbar WASM 文件未找到" -ForegroundColor Yellow
    Write-Host "请从以下地址下载并放入 public\wasm\ 目录：" -ForegroundColor Cyan
    Write-Host "  1. https://cimbar.org (推荐)" -ForegroundColor White
    Write-Host "  2. https://github.com/sz3/libcimbar/releases" -ForegroundColor White
    Write-Host "`n详细说明请查看: public\wasm\README.md" -ForegroundColor Cyan
}

# 完成
Write-Host "`n✅ 安装完成！" -ForegroundColor Green
Write-Host "`n🎯 下一步：" -ForegroundColor Cyan
Write-Host "  1. 下载 libcimbar WASM 文件（如果还没有）" -ForegroundColor White
Write-Host "  2. 运行开发服务器: npm run tauri:dev" -ForegroundColor White
Write-Host "  3. 构建应用: npm run tauri:build" -ForegroundColor White
Write-Host "`n📚 详细文档: TAURI_SETUP.md" -ForegroundColor Cyan
Write-Host "`n🎉 开始使用 Ciphora！" -ForegroundColor Green




