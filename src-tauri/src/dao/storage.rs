use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub const CURRENT_SPACE_MARKER: &str = "current_space.txt";

/// 获取应用数据目录
pub async fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))
}

/// 获取当前正在使用的空间名称
pub async fn get_current_space_name(app: &AppHandle) -> String {
    let dir = match get_app_data_dir(app).await {
        Ok(d) => d,
        Err(_) => return "default".to_string(),
    };
    let marker_path = dir.join(CURRENT_SPACE_MARKER);
    if marker_path.exists() {
        std::fs::read_to_string(marker_path).unwrap_or_else(|_| "default".to_string())
    } else {
        "default".to_string()
    }
}

/// 设置当前正在使用的空间名称
pub async fn set_current_space_name(app: &AppHandle, name: &str) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?;
    let marker_path = dir.join(CURRENT_SPACE_MARKER);
    std::fs::write(marker_path, name).map_err(|e| format!("写入空间标识失败: {}", e))
}

/// 智能存档当前空间
pub async fn archive_current_space(app: &AppHandle) -> Result<Option<String>, String> {
    let dir = get_app_data_dir(app).await?;
    
    // 安全检查：如果主密码文件都不存在，无需封存
    let master_key = dir.join(crate::util::constants::MASTER_KEY_FILE);
    if !master_key.exists() {
        return Ok(None);
    }

    // 获取当前名字，如果是默认则生成新名字
    let current_name = get_current_space_name(app).await;
    let archive_name = if current_name == "default" {
        format!("archive_{}", chrono::Local::now().format("%Y%m%d_%H%M%S"))
    } else {
        current_name
    };

    let archive_dir = dir.join("spaces").join(&archive_name);
    std::fs::create_dir_all(&archive_dir).map_err(|e| format!("创建封存目录失败: {}", e))?;

    // 封存文件（使用 copy 保证主目录在重启前依然可用，但之后需调用 clear_current_space）
    let files = vec![
        crate::util::constants::MASTER_KEY_FILE,
        crate::util::constants::PASSWORD_FILE,
        crate::util::constants::GROUPS_FILE,
        crate::util::constants::SETTINGS_FILE,
    ];

    for file_name in files {
        let src = dir.join(file_name);
        if src.exists() {
            let dest = archive_dir.join(file_name);
            std::fs::copy(src, dest).map_err(|e| format!("同步文件 {} 失败: {}", file_name, e))?;
        }
    }

    Ok(Some(archive_name))
}

/// 清理当前空间（物理删除主目录敏感文件）
pub async fn clear_current_space(app: &AppHandle) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?;
    let files = vec![
        crate::util::constants::MASTER_KEY_FILE,
        crate::util::constants::PASSWORD_FILE,
        crate::util::constants::GROUPS_FILE,
        crate::util::constants::SETTINGS_FILE,
        CURRENT_SPACE_MARKER,
    ];

    for file_name in files {
        let path = dir.join(file_name);
        if path.exists() {
            let _ = std::fs::remove_file(path);
        }
    }
    Ok(())
}

/// 还原指定的历史空间
pub async fn restore_archived_space(app: &AppHandle, archive_name: &str) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?;
    let archive_dir = dir.join("spaces").join(archive_name);

    if !archive_dir.exists() {
        return Err("历史密码本不存在".to_string());
    }

    // 1. 先保存当前的进度到它自己的名字下
    let _ = archive_current_space(app).await?;

    // 2. 拷贝存档回主目录
    let files = vec![
        crate::util::constants::MASTER_KEY_FILE,
        crate::util::constants::PASSWORD_FILE,
        crate::util::constants::GROUPS_FILE,
        crate::util::constants::SETTINGS_FILE,
    ];

    for file_name in files {
        let src = archive_dir.join(file_name);
        if src.exists() {
            let dest = dir.join(file_name);
            std::fs::copy(src, dest).map_err(|e| format!("还原文件 {} 失败: {}", file_name, e))?;
        }
    }

    // 3. 更新当前标识
    set_current_space_name(app, archive_name).await?;

    Ok(())
}

/// 列出所有历史空间（排除当前的）
pub async fn list_archived_spaces(app: &AppHandle) -> Result<Vec<String>, String> {
    let dir = get_app_data_dir(app).await?.join("spaces");
    let current = get_current_space_name(app).await;
    
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut spaces = vec![];
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.starts_with("archive_") && name != current {
                            spaces.push(name.to_string());
                        }
                    }
                }
            }
        }
    }
    spaces.sort_by(|a, b| b.cmp(a));
    Ok(spaces)
}

/// 彻底删除历史空间存档
pub async fn delete_archived_space(app: &AppHandle, archive_name: &str) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?.join("spaces").join(archive_name);
    if dir.exists() {
        std::fs::remove_dir_all(dir).map_err(|e| format!("删除失败: {}", e))?;
    }
    Ok(())
}

pub async fn save_to_file(app: &AppHandle, filename: &str, data: &str) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
    std::fs::write(dir.join(filename), data).map_err(|e| format!("写入文件失败: {}", e))
}

pub async fn load_from_file(app: &AppHandle, filename: &str) -> Result<String, String> {
    let dir = get_app_data_dir(app).await?;
    let file_path = dir.join(filename);
    if !file_path.exists() { return Ok(String::new()); }
    std::fs::read_to_string(file_path).map_err(|e| format!("读取文件失败: {}", e))
}
