use std::fs;

use tauri::AppHandle;

use super::storage;
use crate::util::constants::SETTINGS_FILE;

/// 用途: 读取设置文件; 输入: AppHandle; 输出: Option<String>; 必要性: 启动时加载用户偏好。
pub async fn load_settings(app: &AppHandle) -> Result<Option<String>, String> {
    let dir = storage::get_app_data_dir(app).await?;
    let file_path = dir.join(SETTINGS_FILE);

    if !file_path.exists() {
        return Ok(None);
    }

    fs::read_to_string(file_path)
        .map(|content| Some(content))
        .map_err(|e| format!("读取设置失败: {}", e))
}

/// 用途: 保存设置文件; 输入: AppHandle 与 JSON 字符串; 输出: (); 必要性: 用户更新设置需要持久化。
pub async fn save_settings(app: &AppHandle, content: &str) -> Result<(), String> {
    let dir = storage::get_app_data_dir(app).await?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建设置目录失败: {}", e))?;

    let file_path = dir.join(SETTINGS_FILE);
    fs::write(file_path, content)
        .map_err(|e| format!("写入设置失败: {}", e))
}

