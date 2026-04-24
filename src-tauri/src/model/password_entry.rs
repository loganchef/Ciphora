use serde_json::Value;

/// 用途: 表示一条密码记录; 输入: 任意 JSON 字段; 输出: 通用结构; 必要性: 前端字段形态多样，需保持灵活。
pub type PasswordEntry = Value;

