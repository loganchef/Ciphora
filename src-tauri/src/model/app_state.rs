use std::sync::Mutex;

use super::AppSettings;

/// 用途: 保存应用运行时状态; 输入: 由 Tauri 状态管理注入; 输出: 服务层共享的线程安全数据; 必要性: 所有命令都依赖它判断认证及配置。
pub struct AppState {
    pub master_password_hash: Mutex<Option<String>>,
    pub is_authenticated: Mutex<bool>,
    pub device_id: Mutex<Option<String>>,
    pub settings: Mutex<AppSettings>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            master_password_hash: Mutex::new(None),
            is_authenticated: Mutex::new(false),
            device_id: Mutex::new(None),
            settings: Mutex::new(AppSettings::default()),
        }
    }
}

