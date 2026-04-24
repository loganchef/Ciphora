use std::fs;

use tauri::AppHandle;

use super::storage;
use crate::util::constants::DEVICE_ID_FILE;

/// 用途: 读取设备 ID; 输入: AppHandle; 输出: 设备ID或None; 必要性: 设备绑定逻辑依赖该值。
pub async fn load_device_id(app: &AppHandle) -> Result<Option<String>, String> {
    let dir = storage::get_app_data_dir(app).await?;
    let file_path = dir.join(DEVICE_ID_FILE);

    if !file_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(&file_path)
        .map(|content| {
            let trimmed = content.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            }
        })
        .map_err(|e| format!("读取设备ID失败: {}", e))
}

/// 用途: 保存设备 ID; 输入: AppHandle 与 ID; 输出: (); 必要性: 首次运行要把设备ID落盘。
pub async fn save_device_id(app: &AppHandle, device_id: &str) -> Result<(), String> {
    let dir = storage::get_app_data_dir(app).await?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建设备目录失败: {}", e))?;

    let file_path = dir.join(DEVICE_ID_FILE);
    fs::write(file_path, device_id)
        .map_err(|e| format!("写入设备ID失败: {}", e))
}

