# 修复 npm EBUSY 文件锁定问题

Write-Host "🔧 正在修复 npm 文件锁定问题..." -ForegroundColor Cyan

# 1. 关闭所有 Electron 进程
Write-Host "`n1️⃣ 关闭 Electron 进程..." -ForegroundColor Yellow
$electronProcesses = Get-Process | Where-Object { $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*Ciphora*" }
if ($electronProcesses) {
    Write-Host "找到以下进程，正在关闭..." -ForegroundColor Yellow
    $electronProcesses | ForEach-Object {
        Write-Host "  - $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "✅ Electron 进程已关闭" -ForegroundColor Green
} else {
    Write-Host "✅ 没有运行的 Electron 进程" -ForegroundColor Green
}

# 2. 关闭可能占用文件的程序
Write-Host "`n2️⃣ 检查文件占用..." -ForegroundColor Yellow
$lockedFiles = @(
    "$PWD\node_modules\electron\dist\resources\default_app.asar"
)

foreach ($file in $lockedFiles) {
    if (Test-Path $file) {
        $processes = Get-Process | Where-Object {
            $_.Path -like "*electron*" -or 
            $_.Modules.FileName -like "*$file*"
        }
        if ($processes) {
            Write-Host "  发现占用: $file" -ForegroundColor Yellow
            $processes | ForEach-Object {
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# 3. 等待文件释放
Write-Host "`n3️⃣ 等待文件释放..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 4. 删除 node_modules（如果存在）
Write-Host "`n4️⃣ 清理 node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  正在删除 node_modules（这可能需要几分钟）..." -ForegroundColor Gray
    try {
        Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction Stop
        Write-Host "  ✅ node_modules 已删除" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  部分文件可能仍被占用，尝试强制删除..." -ForegroundColor Yellow
        # 使用 robocopy 技巧删除（更可靠）
        $emptyDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
        robocopy $emptyDir "node_modules" /MIR /R:0 /W:0 | Out-Null
        Remove-Item "node_modules" -Force -ErrorAction SilentlyContinue
        Remove-Item $emptyDir -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ node_modules 已强制删除" -ForegroundColor Green
    }
} else {
    Write-Host "  ✅ node_modules 不存在" -ForegroundColor Green
}

# 5. 删除 package-lock.json
Write-Host "`n5️⃣ 清理锁定文件..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ package-lock.json 已删除" -ForegroundColor Green
}

# 6. 清理 npm 缓存
Write-Host "`n6️⃣ 清理 npm 缓存..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "  ✅ npm 缓存已清理" -ForegroundColor Green

# 7. 重新安装
Write-Host "`n7️⃣ 重新安装依赖..." -ForegroundColor Yellow
Write-Host "  这可能需要几分钟，请耐心等待..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 安装成功！" -ForegroundColor Green
    Write-Host "`n🎯 下一步：" -ForegroundColor Cyan
    Write-Host "  运行: npm install --save-dev @tauri-apps/cli@next" -ForegroundColor White
    Write-Host "  运行: npm install @tauri-apps/api@next @tauri-apps/plugin-fs@next @tauri-apps/plugin-dialog@next @tauri-apps/plugin-shell@next" -ForegroundColor White
} else {
    Write-Host "`n❌ 安装失败，请检查错误信息" -ForegroundColor Red
    Write-Host "`n💡 如果问题仍然存在，请尝试：" -ForegroundColor Yellow
    Write-Host "  1. 以管理员身份运行 PowerShell" -ForegroundColor White
    Write-Host "  2. 临时禁用杀毒软件" -ForegroundColor White
    Write-Host "  3. 关闭所有可能占用文件的程序（IDE、资源管理器等）" -ForegroundColor White
}




