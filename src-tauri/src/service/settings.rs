use serde_json::Value;
use tauri::{AppHandle, State};

use crate::{
    dao,
    model::{AppSettings, AppState, AutoLockSettings, ImportExportSettings, MfaSettings, PasswordGeneratorSettings, UiSettings},
};

/// 用途: 加载设置或返回默认; 输入: AppHandle; 输出: AppSettings; 必要性: UI 需要持久化配置。
pub async fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    if let Some(raw) = dao::settings::load_settings(app).await? {
        match serde_json::from_str::<AppSettings>(&raw) {
            Ok(settings) => Ok(settings),
            Err(e) => {
                eprintln!("Failed to parse settings: {}, falling back to default", e);
                Ok(AppSettings::default())
            }
        }
    } else {
        Ok(AppSettings::default())
    }
}

/// 用途: 保存设置到磁盘; 输入: AppHandle 与结构体; 输出: (); 必要性: 用户更新设置后需要持久化。
pub async fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("serialize_settings_failed: {}", e))?;
    dao::settings::save_settings(app, &serialized).await
}

/// 用途: 返回当前内存中的设置; 输入: 全局状态; 输出: AppSettings; 必要性: 命令层直接读取。
pub fn get_cached_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

/// 用途: 更新指定设置项; 输入: key/value、AppHandle、状态; 输出: 最新设置; 必要性: 支持 UI 实时保存。
pub async fn update_setting(
    key: String,
    value: Value,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let mut current = state.settings.lock().unwrap().clone();
    
    if let Err(e) = apply_setting(&mut current, &key, value) {
        return Err(format!("apply_setting_failed: {}", e));
    }

    save_settings(&app, &current).await?;

    {
        let mut guard = state.settings.lock().unwrap();
        *guard = current.clone();
    }

    Ok(current)
}

/// 用途: 重置设置为默认; 输入: AppHandle 与状态; 输出: 默认设置; 必要性: 提供一键恢复。
pub async fn reset_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<AppSettings, String> {
    let default = AppSettings::default();
    save_settings(&app, &default).await?;
    {
        let mut guard = state.settings.lock().unwrap();
        *guard = default.clone();
    }
    Ok(default)
}

fn apply_setting(settings: &mut AppSettings, key: &str, value: Value) -> Result<(), String> {
    match key {
        "autoLock" => {
            let update: AutoLockSettings = serde_json::from_value(value)
                .map_err(|e| format!("invalid_autoLock_format: {}", e))?;
            settings.auto_lock = update;
        }
        "passwordGenerator" => {
            let update: PasswordGeneratorSettings = serde_json::from_value(value)
                .map_err(|e| format!("invalid_passwordGenerator_format: {}", e))?;
            settings.password_generator = update;
        }
        "ui" => {
            let update: UiSettings = serde_json::from_value(value)
                .map_err(|e| format!("invalid_ui_format: {}", e))?;
            settings.ui = update;
        }
        "mfa" => {
            let update: MfaSettings = serde_json::from_value(value)
                .map_err(|e| format!("invalid_mfa_format: {}", e))?;
            settings.mfa = update;
        }
        "importExport" => {
            let update: ImportExportSettings = serde_json::from_value(value)
                .map_err(|e| format!("invalid_importExport_format: {}", e))?;
            settings.import_export = update;
        }
        _ => return Err(format!("unsupported_setting_item: {}", key)),
    }

    Ok(())
}
