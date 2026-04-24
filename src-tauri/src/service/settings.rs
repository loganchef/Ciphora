use serde_json::Value;
use tauri::{AppHandle, State};

use crate::{
    dao,
    model::{AppSettings, AppState, AutoLockSettings, ImportExportSettings, MfaSettings, PasswordGeneratorSettings, UiSettings},
};

/// 用途: 加载设置或返回默认; 输入: AppHandle; 输出: AppSettings; 必要性: UI 需要持久化配置。
pub async fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    if let Some(raw) = dao::settings::load_settings(app).await? {
        serde_json::from_str::<AppSettings>(&raw)
            .map_err(|e| format!("解析设置失败: {}", e))
    } else {
        Ok(AppSettings::default())
    }
}

/// 用途: 保存设置到磁盘; 输入: AppHandle 与结构体; 输出: (); 必要性: 用户更新设置后需要持久化。
pub async fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;
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
    apply_setting(&mut current, &key, value)?;

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
            settings.auto_lock = serde_json::from_value::<AutoLockSettings>(value)
                .map_err(|e| format!("解析 autoLock 失败: {}", e))?;
        }
        "passwordGenerator" => {
            settings.password_generator = serde_json::from_value::<PasswordGeneratorSettings>(value)
                .map_err(|e| format!("解析 passwordGenerator 失败: {}", e))?;
        }
        "ui" => {
            settings.ui = serde_json::from_value::<UiSettings>(value)
                .map_err(|e| format!("解析 ui 设置失败: {}", e))?;
        }
        "mfa" => {
            settings.mfa = serde_json::from_value::<MfaSettings>(value)
                .map_err(|e| format!("解析 mfa 设置失败: {}", e))?;
        }
        "importExport" => {
            settings.import_export = serde_json::from_value::<ImportExportSettings>(value)
                .map_err(|e| format!("解析 importExport 设置失败: {}", e))?;
        }
        _ => return Err(format!("不支持的设置项: {}", key)),
    }

    Ok(())
}

