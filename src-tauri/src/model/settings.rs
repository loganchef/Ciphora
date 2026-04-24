use serde::{Deserialize, Serialize};

/// 用途: 自动锁定设置; 输入: JSON; 输出: 结构体; 必要性: 控制安全行为。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AutoLockSettings {
    pub enabled: bool,
    pub timeout: u64,
    pub on_minimize: bool,
    pub on_blur: bool,
}

impl Default for AutoLockSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            timeout: 30 * 60 * 1000,
            on_minimize: true,
            on_blur: false,
        }
    }
}

/// 用途: 密码生成器配置; 输入: JSON; 输出: 结构体; 必要性: 统一生成行为。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PasswordGeneratorSettings {
    pub default_length: usize,
    pub include_uppercase: bool,
    pub include_lowercase: bool,
    pub include_numbers: bool,
    pub include_symbols: bool,
    pub exclude_similar: bool,
    pub custom_charset: String,
}

impl Default for PasswordGeneratorSettings {
    fn default() -> Self {
        Self {
            default_length: 16,
            include_uppercase: true,
            include_lowercase: true,
            include_numbers: true,
            include_symbols: true,
            exclude_similar: true,
            custom_charset: String::new(),
        }
    }
}

/// 用途: UI 配置; 输入: JSON; 输出: 结构体; 必要性: 控制界面细节。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct UiSettings {
    pub hide_sensitive_buttons: bool,
    pub show_password_strength: bool,
    pub compact_mode: bool,
    pub theme: String,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            hide_sensitive_buttons: true,
            show_password_strength: true,
            compact_mode: false,
            theme: "system".to_string(),
        }
    }
}

/// 用途: MFA 配置; 输入: JSON; 输出: 结构体; 必要性: 控制二次验证。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct MfaSettings {
    pub enabled: bool,
    pub secret: Option<String>,
    pub backup_codes: Vec<String>,
}

impl Default for MfaSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            secret: None,
            backup_codes: Vec::new(),
        }
    }
}

/// 用途: 导入导出配置; 输入: JSON; 输出: 结构体; 必要性: 控制备份策略。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ImportExportSettings {
    pub auto_backup: bool,
    pub backup_interval: u64,
    pub last_backup: Option<String>,
}

impl Default for ImportExportSettings {
    fn default() -> Self {
        Self {
            auto_backup: true,
            backup_interval: 24 * 60 * 60 * 1000,
            last_backup: None,
        }
    }
}

/// 用途: 汇总所有设置项; 输入: JSON; 输出: 配置对象; 必要性: 各模块共享统一结构。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub auto_lock: AutoLockSettings,
    pub password_generator: PasswordGeneratorSettings,
    pub ui: UiSettings,
    pub mfa: MfaSettings,
    pub import_export: ImportExportSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_lock: AutoLockSettings::default(),
            password_generator: PasswordGeneratorSettings::default(),
            ui: UiSettings::default(),
            mfa: MfaSettings::default(),
            import_export: ImportExportSettings::default(),
        }
    }
}

