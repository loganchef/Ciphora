use tauri::AppHandle;

use crate::{
    dao::{device, state},
    model::{AppSettings, AppState},
    service::settings,
    util::device as device_util,
};

/// 用途: 启动时同步加载主密码哈希、设备ID与设置; 输入: AppHandle 与全局状态; 输出: 初始化结果; 必要性: 保障命令层读取到持久化数据。
pub async fn initialize(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    refresh_master_hash(app, state_ref).await?;
    refresh_device_id(app, state_ref).await?;
    refresh_settings(app, state_ref).await?;
    Ok(())
}

/// 用途: 确保在需要时重新加载持久化状态; 输入: AppHandle 与状态; 输出: (); 必要性: 处理后端重启或热重载后的空状态。
pub async fn ensure_loaded(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    refresh_master_hash(app, state_ref).await?;
    refresh_device_id(app, state_ref).await?;
    refresh_settings(app, state_ref).await?;
    Ok(())
}

async fn refresh_master_hash(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    let needs_load = state_ref.master_password_hash.lock().unwrap().is_none();
    if needs_load {
        if let Some(hash) = state::load_master_hash(app).await? {
            *state_ref.master_password_hash.lock().unwrap() = Some(hash);
        }
    }
    Ok(())
}

async fn refresh_device_id(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    let needs_load = state_ref.device_id.lock().unwrap().is_none();
    if needs_load {
        let device_id = match device::load_device_id(app).await? {
            Some(id) => id,
            None => {
                let new_id = device_util::generate_uuid();
                device::save_device_id(app, &new_id).await?;
                new_id
            }
        };
        *state_ref.device_id.lock().unwrap() = Some(device_id);
    }
    Ok(())
}

async fn refresh_settings(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    let loaded_settings: AppSettings = settings::load_settings(app).await?;
    *state_ref.settings.lock().unwrap() = loaded_settings;
    Ok(())
}

