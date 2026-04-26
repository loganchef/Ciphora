use tauri::AppHandle;

use crate::{
    dao::{device, state},
    model::{AppSettings, AppState},
    service::settings,
    util::device as device_util,
};

/// 启动时同步加载状态
pub async fn initialize(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    load_from_disk(app, state_ref, false).await
}

/// 确保状态已加载（仅在为空时加载）
pub async fn ensure_loaded(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    load_from_disk(app, state_ref, false).await
}

/// 强制从磁盘重新加载所有状态（用于切换空间）
pub async fn reload(app: &AppHandle, state_ref: &AppState) -> Result<(), String> {
    load_from_disk(app, state_ref, true).await
}

/// 统一的加载逻辑
async fn load_from_disk(app: &AppHandle, state_ref: &AppState, force: bool) -> Result<(), String> {
    // 1. 加载主密码哈希
    if force || state_ref.master_password_hash.lock().unwrap().is_none() {
        let hash = state::load_master_hash(app).await?;
        *state_ref.master_password_hash.lock().unwrap() = hash;
    }

    // 2. 加载设备 ID
    if force || state_ref.device_id.lock().unwrap().is_none() {
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

    // 3. 加载设置（设置总是重新加载以确保同步）
    let loaded_settings: AppSettings = settings::load_settings(app).await?;
    *state_ref.settings.lock().unwrap() = loaded_settings;

    // 4. 重置认证状态（切换空间后必须重新登录）
    *state_ref.is_authenticated.lock().unwrap() = false;

    Ok(())
}
