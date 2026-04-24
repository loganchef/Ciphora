use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::PasswordEntry;

/// 用途: 表示导入冲突; 输入: 分析阶段; 输出: 前端提示; 必要性: 帮助用户决策。
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportConflict {
    pub key: String,
    pub imported: PasswordEntry,
    pub existing: PasswordEntry,
}

/// 用途: 导入分析结果; 输入: 待导入数据; 输出: 冲突与新增; 必要性: 驱动预览 UI。
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportAnalysis {
    pub total: usize,
    pub new: Vec<PasswordEntry>,
    pub conflicts: Vec<ImportConflict>,
    pub existing: Vec<PasswordEntry>,
}

/// 用途: 导入分析响应; 输入: 分析结果; 输出: 包含预览标记; 必要性: 统一命令返回格式。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAnalysisResponse {
    pub success: bool,
    pub requires_preview: bool,
    pub analysis: ImportAnalysis,
}

/// 用途: 导入处理响应; 输入: 最终导入数量; 输出: 前端提示; 必要性: 命令返回结构统一。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProcessResult {
    pub success: bool,
    pub message: String,
    pub imported_count: usize,
}

/// 用途: 导入冲突解决方案; 输入: 用户在前端选择; 输出: 后端决策依据; 必要性: 控制导入策略。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResolution {
    pub mode: String,
    pub conflicts: HashMap<String, String>,
}

/// 用途: 备份文件结构; 输入: 备份创建/恢复; 输出: JSON 文件; 必要性: 定义备份格式。
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupFile {
    pub version: String,
    #[serde(default)]
    pub timestamp: Option<String>,
    #[serde(default)]
    pub payload: Option<String>,
    #[serde(default)]
    pub encrypted: Option<String>,
    #[serde(default)]
    pub iv: Option<String>,
    #[serde(default)]
    pub salt: Option<String>,
}

/// 用途: 备份响应; 输入: 备份内容; 输出: 命令返回; 必要性: 提示前端保存。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResponse {
    pub success: bool,
    pub backup_data: BackupFile,
}

/// 用途: 备份恢复结果; 输入: 操作成功信息; 输出: 提示; 必要性: 统一返回格式。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResponse {
    pub success: bool,
    pub message: String,
    pub restored_count: usize,
}

