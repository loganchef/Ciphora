# 清理 Electron 相关文件的脚本

Write-Host "🧹 开始清理 Electron 相关文件..." -ForegroundColor Cyan

$filesToDelete = @(
    "main.cjs",
    "preload.js"
)

$dirsToDelete = @(
    "server"
)

Write-Host "`n⚠️  警告：此操作将删除以下文件和目录：" -ForegroundColor Yellow
Write-Host "文件：" -ForegroundColor Yellow
foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Write-Host "  - $file" -ForegroundColor Gray
    }
}

Write-Host "`n目录：" -ForegroundColor Yellow
foreach ($dir in $dirsToDelete) {
    if (Test-Path $dir) {
        Write-Host "  - $dir/" -ForegroundColor Gray
    }
}

$confirm = Read-Host "`n确认删除？(y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🗑️  正在删除..." -ForegroundColor Yellow

# 删除文件
foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "  ✅ 已删除: $file" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ 删除失败: $file - $_" -ForegroundColor Red
        }
    }
}

# 删除目录
foreach ($dir in $dirsToDelete) {
    if (Test-Path $dir) {
        try {
            Remove-Item $dir -Recurse -Force
            Write-Host "  ✅ 已删除: $dir/" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ 删除失败: $dir/ - $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ 清理完成！" -ForegroundColor Green
Write-Host "`n💡 建议：" -ForegroundColor Cyan
Write-Host "  1. 运行 npm run tauri:dev 测试应用" -ForegroundColor White
Write-Host "  2. 确认所有功能正常" -ForegroundColor White
Write-Host "  3. 如果已备份，可以删除备份文件" -ForegroundColor White




