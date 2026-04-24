/// 用途: 统一管理后端文件命名; 输入: 各模块引用; 输出: 常量; 必要性: 避免魔法字符串散落全局。
pub const PASSWORD_FILE: &str = "passwords.enc";
pub const MASTER_KEY_FILE: &str = "master.key";
pub const SETTINGS_FILE: &str = "settings.json";
pub const DEVICE_ID_FILE: &str = "device.id";

