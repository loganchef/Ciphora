use std::fs;

use tauri::AppHandle;

use super::storage;
use crate::util::constants::MASTER_KEY_FILE;

/// 用途: 读取主密码哈希; 输入: AppHandle; 输出: Option<String>; 必要性: 启动时判断是否初始化。
pub async fn load_master_hash(app: &AppHandle) -> Result<Option<String>, String> {
    let dir = storage::get_app_data_dir(app).await?;
    let file_path = dir.join(MASTER_KEY_FILE);

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
        .map_err(|e| format!("读取主密码哈希失败: {}", e))
}

/// 用途: 保存主密码哈希; 输入: AppHandle 与哈希; 输出: (); 必要性: 初始化/修改主密码后需要落盘。
pub async fn save_master_hash(app: &AppHandle, hash: &str) -> Result<(), String> {
    let dir = storage::get_app_data_dir(app).await?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建密码目录失败: {}", e))?;

    let file_path = dir.join(MASTER_KEY_FILE);
    fs::write(file_path, hash)
        .map_err(|e| format!("写入主密码哈希失败: {}", e))
}

/// 用途: 物理删除主密码哈希文件; 输入: AppHandle; 输出: (); 必要性: 用于忘记密码时的重置操作。
pub async fn wipe_state(app: &AppHandle) -> Result<(), String> {
    let dir = storage::get_app_data_dir(app).await?;
    let file_path = dir.join(MASTER_KEY_FILE);

    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| format!("删除主密码文件失败: {}", e))?;
    }
    Ok(())
}
