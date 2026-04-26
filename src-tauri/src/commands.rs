use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::{
    model::{
        AppSettings,
        AppState,
        BackupFile,
        BackupResponse,
        Group,
        ImportAnalysisResponse,
        ImportProcessResult,
        ImportResolution,
        PasswordEntry,
        RestoreResponse,
        SetupResponse,
        SetupStatusResponse,
    },
    service::{
        auth,
        group as group_service,
        import_export,
        mfa,
        password as password_service,
        settings as settings_service,
    },
    util::crypto,
};

/// 用途: 初始化主密码; 输入: 明文密码、AppHandle 与全局状态; 输出: SetupResponse; 必要性: 应用第一次使用必须先设置主密码。
#[tauri::command]
pub async fn setup_master_password(
    password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<SetupResponse, String> {
    auth::setup_master_password(password, &app, state).await
}

/// 用途: 验证主密码; 输入: 明文密码与状态; 输出: bool; 必要性: 用户登录流程。
#[tauri::command]
pub async fn verify_master_password(
    password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<bool, String> {
    auth::verify_master_password(password, &app, state).await
}

/// 用途: 判断是否已初始化; 输入: 状态; 输出: bool; 必要性: 决定前端流程。
#[tauri::command]
pub async fn check_setup_status(
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<SetupStatusResponse, String> {
    auth::check_setup_status(&app, state).await
}

/// 用途: 彻底重置应用（删除主密码和所有设置）; 输入: AppHandle, 状态; 输出: (); 必要性: 用于忘记密码时的重置。
#[tauri::command]
pub async fn full_reset(
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<(), String> {
    auth::reset_initialization_status(&app, state).await?;
    settings_service::reset_settings(app, state).await?;
    Ok(())
}

/// 用途: 注销当前用户; 输入: 状态; 输出: (); 必要性: 安全退出。
#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    auth::logout(state)
}

/// 用途: 保存密码; 输入: 密码列表、主密码、AppHandle、状态; 输出: (); 必要性: 把前端修改写入存储。
#[tauri::command]
pub async fn save_passwords(
    passwords: Vec<PasswordEntry>,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<(), String> {
    password_service::save_passwords(passwords, master_password, app, state).await
}

/// 用途: 加载密码; 输入: 主密码、AppHandle、状态; 输出: 密码数组; 必要性: 应用启动后展示数据。
#[tauri::command]
pub async fn load_passwords(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>
) -> Result<Vec<PasswordEntry>, String> {
    password_service::load_passwords(master_password, app, state).await
}

#[derive(Serialize)]
pub struct SettingsResponse {
    pub success: bool,
    pub settings: AppSettings,
}

/// 用途: 获取当前设置; 输入: 状态; 输出: 设置内容; 必要性: 设置界面加载初始值。
#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<SettingsResponse, String> {
    let settings = settings_service::get_cached_settings(state);
    Ok(SettingsResponse {
        success: true,
        settings,
    })
}

/// 用途: 更新指定设置; 输入: key/value、AppHandle、状态; 输出: 最新设置; 必要性: 支持 UI 实时保存。
#[tauri::command]
pub async fn update_setting(
    key: String,
    value: Value,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SettingsResponse, String> {
    let settings = settings_service::update_setting(key, value, app, state).await?;
    Ok(SettingsResponse {
        success: true,
        settings,
    })
}

/// 用途: 重置全部设置; 输入: AppHandle、状态; 输出: 默认设置; 必要性: 允许恢复初始配置。
#[tauri::command]
pub async fn reset_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SettingsResponse, String> {
    let settings = settings_service::reset_settings(app, state).await?;
    Ok(SettingsResponse {
        success: true,
        settings,
    })
}

/// 用途: 分析导入数据; 输入: 密码数组、主密码; 输出: 冲突分析; 必要性: 导入流程预览。
#[tauri::command]
pub async fn analyze_import_data(
    passwords: Vec<PasswordEntry>,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportAnalysisResponse, String> {
    import_export::analyze_import_data(passwords, master_password, app, state).await
}

/// 用途: 根据用户选择处理导入; 输入: 密码数组、策略、主密码; 输出: 导入结果。
#[tauri::command]
pub async fn process_import_with_resolution(
    passwords: Vec<PasswordEntry>,
    resolution: ImportResolution,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportProcessResult, String> {
    import_export::process_import_with_resolution(passwords, resolution, master_password, app, state).await
}

/// 用途: 创建备份; 输入: 备份密码、主密码; 输出: 备份数据。
#[tauri::command]
pub async fn create_backup(
    backup_password: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<BackupResponse, String> {
    import_export::create_backup(backup_password, master_password, app, state).await
}

/// 用途: 恢复备份; 输入: 备份文件、备份密码、主密码; 输出: 恢复结果。
#[tauri::command]
pub async fn restore_backup(
    backup_data: BackupFile,
    backup_password: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<RestoreResponse, String> {
    import_export::restore_backup(backup_data, backup_password, master_password, app, state).await
}

/// 用途: 添加密码; 输入: 数据、主密码、AppHandle、状态; 输出: 新记录; 必要性: 后端负责 CRUD。
#[tauri::command]
pub async fn add_password(
    password: PasswordEntry,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<PasswordEntry, String> {
    password_service::add_password(password, master_password, app, state).await
}

/// 用途: 更新密码; 输入: ID、数据、主密码; 输出: 更新后的记录; 必要性: 提供后端修改。
#[tauri::command]
pub async fn update_password(
    id: String,
    password: PasswordEntry,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<PasswordEntry, String> {
    password_service::update_password(id, password, master_password, app, state).await
}

/// 用途: 删除密码; 输入: ID、主密码; 输出: (); 必要性: 清理指定记录。
#[tauri::command]
pub async fn delete_password(
    id: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    password_service::delete_password(id, master_password, app, state).await
}

/// 用途: 清空密码; 输入: 主密码; 输出: (); 必要性: 一键清除。
#[tauri::command]
pub async fn clear_passwords(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    password_service::clear_passwords(master_password, app, state).await
}

/// 用途: 搜索密码; 输入: 关键字、主密码; 输出: 匹配列表; 必要性: 后端搜索。
#[tauri::command]
pub async fn search_passwords(
    keyword: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<PasswordEntry>, String> {
    password_service::search_passwords(keyword, master_password, app, state).await
}

/// 用途: 获取统计信息; 输入: 主密码; 输出: JSON; 必要性: 仪表盘。
#[tauri::command]
pub async fn password_statistics(
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    password_service::get_statistics(master_password, app, state).await
}

/// 用途: 获取当前加密后的密码库; 输入: AppHandle、状态; 输出: JSON; 必要性: 二维码传输。
#[tauri::command]
pub async fn get_encrypted_vault(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    password_service::get_encrypted_vault(app, state).await
}

/// 用途: 为 Cimbar 传输准备加密数据; 输入: 主密码、分享密码、选择的 ID; 输出: JSON; 必要性: 支持自定义分享内容。
#[tauri::command]
pub async fn prepare_cimbar_payload(
    master_password: String,
    share_password: Option<String>,
    selected_ids: Option<Vec<String>>,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    password_service::prepare_cimbar_payload(
        master_password,
        share_password,
        selected_ids,
        app,
        state,
    )
    .await
}

/// 用途: 生成随机密码; 输入: 参数选项; 输出: 新密码; 必要性: 前端生成按钮使用。
#[tauri::command]
pub async fn generate_password(
    length: usize,
    include_uppercase: bool,
    include_numbers: bool,
    include_symbols: bool
) -> Result<String, String> {
    crypto::generate_random_password(length, include_uppercase, include_numbers, include_symbols)
}

/// 用途: 生成 MFA 密钥; 输入: 无; 输出: Base64; 必要性: 开启 MFA 时的后端支持。
#[tauri::command]
pub async fn generate_mfa_secret() -> Result<String, String> {
    mfa::generate_secret()
}

/// 用途: 生成当前 TOTP; 输入: 密钥; 输出: 验证码; 必要性: 前端展示验证码。
#[tauri::command]
pub async fn generate_totp(secret: String) -> Result<serde_json::Value, String> {
    let totp = mfa::generate_totp(&secret)?;
    Ok(serde_json::json!({
        "success": true,
        "totp": totp
    }))
}

/// 用途: 生成下一组 TOTP 验证码; 输入: 密钥; 输出: 验证码; 必要性: 预告下一组验证码。
#[tauri::command]
pub async fn generate_next_totp(secret: String) -> Result<serde_json::Value, String> {
    let totp = mfa::generate_next_totp(&secret)?;
    Ok(serde_json::json!({
        "success": true,
        "totp": totp
    }))
}

/// 用途: 验证 TOTP; 输入: secret 与 token; 输出: bool; 必要性: MFA 流程。
#[tauri::command]
pub async fn verify_mfa_token(secret: String, token: String) -> Result<bool, String> {
    mfa::verify_token(&secret, &token)
}

/// 用途: 导出密码数据; 输入: 数据与格式; 输出: 格式化字符串; 必要性: 备份需求。
#[tauri::command]
pub async fn export_data(
    passwords: Vec<PasswordEntry>,
    format: String
) -> Result<String, String> {
    match format.as_str() {
        "json" => {
            serde_json::to_string_pretty(&passwords)
                .map_err(|e| format!("导出失败: {}", e))
        }
        "csv" => {
            // 实现 CSV 导出
            Err("CSV 格式暂不支持".to_string())
        }
        _ => Err("不支持的格式".to_string())
    }
}

/// 用途: 导入密码数据; 输入: 字符串和格式; 输出: 解析后的密码数组; 必要性: 兼容外部数据。
#[tauri::command]
pub async fn import_data(
    data: String,
    format: String
) -> Result<Vec<PasswordEntry>, String> {
    match format.as_str() {
        "json" => {
            serde_json::from_str(&data)
                .map_err(|e| format!("导入失败: {}", e))
        }
        _ => Err("不支持的格式".to_string())
    }
}

/// 用途: 返回应用信息; 输入: 无; 输出: JSON; 必要性: 前端展示版本等信息。
#[tauri::command]
pub async fn get_app_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "name": env!("CARGO_PKG_NAME"),
    }))
}

/// 用途: 获取系统语言; 输入: AppHandle; 输出: String; 必要性: 前端同步语言。
#[tauri::command]
pub async fn get_system_locale() -> Result<String, String> {
    Ok(tauri_plugin_os::locale().unwrap_or_else(|| "en-US".to_string()))
}

// ==================== 分组相关 ====================

/// 用途: 获取所有分组; 输入: AppHandle; 输出: 分组列表; 必要性: 前端展示分组。
#[tauri::command]
pub async fn get_groups(app: tauri::AppHandle) -> Result<Vec<Group>, String> {
    group_service::get_groups(app).await
}

#[tauri::command]
pub async fn add_group(
    app: tauri::AppHandle,
    name: String,
    color: String,
    icon: String,
    icon_color: String,
) -> Result<Group, String> {
    group_service::add_group(app, name, color, icon, icon_color).await
}

/// 用途: 更新分组; 输入: ID 与新属性; 输出: 更新后分组; 必要性: 用户编辑分组。
#[tauri::command]
pub async fn update_group(
    app: tauri::AppHandle,
    id: String,
    name: String,
    color: String,
    icon: String,
    icon_color: String,
) -> Result<Group, String> {
    group_service::update_group(app, id, name, color, icon, icon_color).await
}

/// 用途: 删除分组; 输入: ID; 输出: (); 必要性: 用户删除分组，密码归入未分组。
#[tauri::command]
pub async fn delete_group(app: tauri::AppHandle, id: String) -> Result<(), String> {
    group_service::delete_group(app, id).await
}

/// 用途: 重新排序分组; 输入: ID 有序列表; 输出: (); 必要性: 支持拖拽排序。
#[tauri::command]
pub async fn reorder_groups(app: tauri::AppHandle, group_ids: Vec<String>) -> Result<(), String> {
    group_service::reorder_groups(app, group_ids).await
}

/// 用途: 批量移动密码到分组; 输入: 密码 ID 列表、目标分组 ID; 输出: (); 必要性: 批量操作。
#[tauri::command]
pub async fn move_passwords_to_group(
    password_ids: Vec<String>,
    group_id: Option<String>,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    password_service::move_passwords_to_group(password_ids, group_id, master_password, app, state).await
}

#[tauri::command]
pub async fn increment_usage_count(
    id: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    password_service::increment_usage_count(id, master_password, app, state).await
}

/// 用途: 导入 Cimbar 传输载荷; 输入: data、share_password_set、分享密码、主密码; 输出: 导入计数; 必要性: 处理 base64 和加密两种格式。
#[tauri::command]
pub async fn import_cimbar_payload(
    data: String,
    share_password_set: bool,
    share_password: String,
    master_password: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    import_export::import_cimbar_payload(data, share_password_set, share_password, master_password, app, state).await
}




