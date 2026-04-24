use serde::{Deserialize, Serialize};

/// 用途: 命令返回通用结果; 输入: 服务运行结果; 输出: 给前端的 JSON; 必要性: 保证 API 返回格式稳定。
#[derive(Debug, Serialize, Deserialize)]
pub struct SetupResponse {
    pub success: bool,
    pub message: String,
}

/// 用途: 返回初始化状态; 输入: 状态检查结果; 输出: 给前端的布尔标记; 必要性: 启动流程需要区分初始化或登录。
#[derive(Debug, Serialize, Deserialize)]
pub struct SetupStatusResponse {
    pub success: bool,
    #[serde(rename = "isInitialized")]
    pub is_initialized: bool,
}

