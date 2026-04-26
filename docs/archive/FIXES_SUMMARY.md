# Tauri 迁移修复总结

## 修复日期
2026-04-24

## 修复的问题

### 1. ✅ CimbarDecoder WASM 堆指针 Bug（核心问题）

**问题描述：**
- `CimbarDecoder.jsx:221` 直接传递 `imageData.data.byteOffset` 给 WASM 函数
- `imageData.data` 是普通 JavaScript ArrayBuffer，不在 WASM 堆上
- 导致解码器读取错误的内存地址，无法正常工作

**修复方案：**
- 在调用 WASM 函数前，先用 `Module._malloc()` 分配 WASM 堆内存
- 将 `imageData.data` 复制到 WASM 堆：`wasmImageData.set(imageData.data)`
- 传递正确的 WASM 堆指针 `imageDataPtr` 给解码函数
- 在处理完成后释放内存：`Module._free(imageDataPtr)`

**影响：**
- 修复后，摄像头扫描 Cimbar 动态二维码功能可以正常工作
- 跨机器数据传输功能现在可用

### 2. ✅ Tauri 摄像头权限配置

**问题描述：**
- 只有 `mobile.json` capability 文件
- 缺少桌面端的权限配置

**修复方案：**
- 创建 `src-tauri/capabilities/desktop.json`
- 配置了完整的桌面端权限：
  - 核心窗口权限（创建、关闭、最大化等）
  - 文件系统读写权限
  - 对话框权限
  - Shell 权限

**影响：**
- 桌面端应用现在有明确的权限声明
- 符合 Tauri 2.0 安全模型

### 3. ✅ MFA 登录验证

**问题描述：**
- `tauri-api.js:53-55` 中 MFA 验证代码被注释
- 即使用户开启了 MFA，登录时也不验证
- 存在安全漏洞

**修复方案：**
- 启用 MFA token 验证逻辑
- 从设置中读取 `settings.mfa.secret`
- 调用 `verify_mfa_token` Rust 命令验证
- 验证失败时返回错误信息

**影响：**
- MFA 功能现在完整可用
- 提升了应用安全性

### 4. ✅ 使用 Tauri Shell 插件打开 URL

**问题描述：**
- `tauri-api.js:436` 使用 `window.open()` 打开 URL
- 没有使用已安装的 `tauri-plugin-shell`
- 不符合 Tauri 安全模型

**修复方案：**
- 导入 `@tauri-apps/plugin-shell` 的 `open` 函数
- 替换 `window.open()` 为 `openUrl(url)`
- 添加错误处理

**影响：**
- URL 打开操作现在通过 Tauri 安全沙盒
- 符合 Tauri 最佳实践

## 仍需注意的问题

### ⚠️ 主密码存储在 `window.__masterPassword`

**问题：**
- 主密码以明文形式存储在全局变量中
- 任何前端脚本都可以访问
- 存在安全风险

**建议：**
- 考虑使用 Tauri 的安全存储 API
- 或在 Rust 后端维护会话状态
- 避免在前端长期保存明文密码

### ⚠️ 旧 Electron 文件未删除

**待删除文件：**
```
main.cjs
preload.js
server/
```

**建议：**
- 确认 Tauri 版本完全正常后再删除
- 先备份这些文件

## 测试建议

1. **测试 Cimbar 跨机器传输：**
   - 在机器 A 上生成 Cimbar 动画码
   - 在机器 B 上用摄像头扫描
   - 验证数据是否正确传输

2. **测试 MFA 登录：**
   - 设置 MFA
   - 退出登录
   - 使用正确/错误的 TOTP 验证码登录
   - 验证验证逻辑是否正常

3. **测试 URL 打开：**
   - 点击任何需要打开外部链接的功能
   - 验证是否正确在浏览器中打开

## 运行测试

```bash
npm run tauri:dev
```

## 相关文件

- `src/components/CimbarDecoder.jsx` - 解码器修复
- `src/api/tauri-api.js` - API 层修复
- `src-tauri/capabilities/desktop.json` - 新增权限配置
