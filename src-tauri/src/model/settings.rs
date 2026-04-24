use serde::{Deserialize, Serialize};

/// 用途: 自动锁定设置; 输入: JSON; 输出: 结构体; 必要性: 控制安全行为。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoLockSettings {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    #[serde(default = "default_true")]
    pub on_minimize: bool,
    #[serde(default = "default_false")]
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
#[serde(rename_all = "camelCase")]
pub struct PasswordGeneratorSettings {
    #[serde(default = "default_length")]
    pub default_length: usize,
    #[serde(default = "default_true")]
    pub include_uppercase: bool,
    #[serde(default = "default_true")]
    pub include_lowercase: bool,
    #[serde(default = "default_true")]
    pub include_numbers: bool,
    #[serde(default = "default_true")]
    pub include_symbols: bool,
    #[serde(default = "default_true")]
    pub exclude_similar: bool,
    #[serde(default)]
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
#[serde(rename_all = "camelCase")]
pub struct UiSettings {
    #[serde(default = "default_true")]
    pub hide_sensitive_buttons: bool,
    #[serde(default = "default_true")]
    pub show_password_strength: bool,
    #[serde(default = "default_false")]
    pub compact_mode: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_card_order")]
    pub card_order: String,
    #[serde(default)]
    pub pagination: PaginationSettings,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            hide_sensitive_buttons: true,
            show_password_strength: true,
            compact_mode: false,
            theme: "system".to_string(),
            card_order: "usage".to_string(),
            pagination: PaginationSettings::default(),
        }
    }
}

/// 用途: 分页配置; 输入: JSON; 输出: 结构体; 必要性: 控制数据展示量。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginationSettings {
    #[serde(default = "default_false")]
    pub enabled: bool,
    #[serde(default = "default_page_size")]
    pub page_size: u32,
}

impl Default for PaginationSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            page_size: 20,
        }
    }
}

/// 用途: MFA 配置; 输入: JSON; 输出: 结构体; 必要性: 控制二次验证。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MfaSettings {
    #[serde(default = "default_false")]
    pub enabled: bool,
    #[serde(default)]
    pub secret: Option<String>,
    #[serde(default)]
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
#[serde(rename_all = "camelCase")]
pub struct ImportExportSettings {
    #[serde(default = "default_true")]
    pub auto_backup: bool,
    #[serde(default = "default_backup_interval")]
    pub backup_interval: u64,
    #[serde(default)]
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
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub auto_lock: AutoLockSettings,
    #[serde(default)]
    pub password_generator: PasswordGeneratorSettings,
    #[serde(default)]
    pub ui: UiSettings,
    #[serde(default)]
    pub mfa: MfaSettings,
    #[serde(default)]
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

// --- Default value helpers for serde ---
fn default_true() -> bool { true }
fn default_false() -> bool { false }
fn default_timeout() -> u64 { 30 * 60 * 1000 }
fn default_length() -> usize { 16 }
fn default_theme() -> String { "system".to_string() }
fn default_card_order() -> String { "usage".to_string() }
fn default_page_size() -> u32 { 20 }
fn default_backup_interval() -> u64 { 24 * 60 * 60 * 1000 }
