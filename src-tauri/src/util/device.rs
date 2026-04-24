use uuid::Uuid;

/// 用途: 生成新的 UUID 字符串; 输入: 无; 输出: UUID; 必要性: 设备标识需要随机值。
pub fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

