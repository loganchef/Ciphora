use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 用途: 获取应用数据目录; 输入: Tauri 应用句柄; 输出: 数据目录路径; 必要性: 所有持久化操作都依赖该路径。
pub async fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))
}

/// 用途: 将字符串写入指定文件; 输入: 文件名与内容; 输出: 写入结果; 必要性: 负责密码库等数据的最终落盘。
pub async fn save_to_file(app: &AppHandle, filename: &str, data: &str) -> Result<(), String> {
    let dir = get_app_data_dir(app).await?;

    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("创建目录失败: {}", e))?;

    let file_path = dir.join(filename);

    std::fs::write(file_path, data)
        .map_err(|e| format!("写入文件失败: {}", e))
}

/// 用途: 从指定文件读取数据; 输入: 文件名; 输出: 文件内容字符串; 必要性: 读取密码库和配置都要经此函数。
pub async fn load_from_file(app: &AppHandle, filename: &str) -> Result<String, String> {
    let dir = get_app_data_dir(app).await?;
    let file_path = dir.join(filename);

    if !file_path.exists() {
        return Ok(String::new());
    }

    std::fs::read_to_string(file_path)
        .map_err(|e| format!("读取文件失败: {}", e))
}

