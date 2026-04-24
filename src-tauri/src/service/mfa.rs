use base64::{engine::general_purpose, Engine as _};
use rand::Rng;
use totp_lite::{totp_custom, Sha1};

/// 用途: 生成新的 TOTP 密钥; 输入: 无; 输出: Base64 字符串; 必要性: 用户开启 MFA 时需要该密钥。
pub fn generate_secret() -> Result<String, String> {
    let mut rng = rand::thread_rng();
    let secret: [u8; 20] = rng.gen();
    Ok(general_purpose::STANDARD.encode(secret))
}

/// 用途: 验证用户提交的 TOTP; 输入: 密钥与 token; 输出: bool; 必要性: 登录二次验证依赖它。
pub fn verify_token(secret: &str, token: &str) -> Result<bool, String> {
    let secret_bytes = general_purpose::STANDARD
        .decode(secret)
        .map_err(|e| format!("解码密钥失败: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    for offset in [-1i64, 0, 1] {
        let test_time = (timestamp as i64 + offset * 30) as u64;
        let generated = totp_custom::<Sha1>(30, 6, &secret_bytes, test_time);

        if format!("{:06}", generated) == token {
            return Ok(true);
        }
    }

    Ok(false)
}

/// 用途: 根据密钥生成当前 TOTP; 输入: Base64 密钥; 输出: 六位字符串; 必要性: 前端显示验证码。
pub fn generate_totp(secret: &str) -> Result<String, String> {
    let secret_bytes = general_purpose::STANDARD
        .decode(secret)
        .map_err(|e| format!("解码密钥失败: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let code = totp_custom::<Sha1>(30, 6, &secret_bytes, timestamp);
    Ok(format!("{:06}", code))
}

/// 用途: 生成下一组 TOTP 验证码; 输入: Base64 密钥; 输出: 六位字符串; 必要性: 预告下一组验证码。
pub fn generate_next_totp(secret: &str) -> Result<String, String> {
    let secret_bytes = general_purpose::STANDARD
        .decode(secret)
        .map_err(|e| format!("解码密钥失败: {}", e))?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // 下一组验证码使用下一个30秒时间窗口
    let next_timestamp = timestamp + 30;
    let code = totp_custom::<Sha1>(30, 6, &secret_bytes, next_timestamp);
    Ok(format!("{:06}", code))
}

