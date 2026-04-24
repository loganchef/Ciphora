use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::{password_hash::{rand_core::RngCore, SaltString}, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use base64::{engine::general_purpose, Engine as _};
use rand::Rng;

/// 用途: 将明文密码哈希成不可逆字符串; 输入: 用户提供的密码; 输出: Argon2 哈希; 必要性: 主密码验证依赖该哈希。
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| format!("密码哈希失败: {}", e))
}

/// 用途: 校验密码是否与哈希匹配; 输入: 明文密码与数据库中的哈希; 输出: 布尔结果; 必要性: 登录流程需要可靠验证。
pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| format!("解析哈希失败: {}", e))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// 用途: 使用主密码对数据进行加密; 输入: 待加密字符串与主密码; 输出: Base64 字符串; 必要性: 保证密码库落盘安全。
pub fn encrypt_data(data: &str, password: &str) -> Result<String, String> {
    let mut key = [0u8; 32];
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);

    let argon2 = Argon2::default();
    argon2
        .hash_password_into(password.as_bytes(), &salt, &mut key)
        .map_err(|e| format!("密钥派生失败: {}", e))?;

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("创建密码器失败: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("加密失败: {}", e))?;

    let mut result = Vec::new();
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(&result))
}

/// 用途: 解密落盘数据; 输入: Base64 字符串与主密码; 输出: 原始 JSON 字符串; 必要性: 加载密码列表必须先解密。
pub fn decrypt_data(encrypted: &str, password: &str) -> Result<String, String> {
    let data = general_purpose::STANDARD
        .decode(encrypted)
        .map_err(|e| format!("Base64解码失败: {}", e))?;

    if data.len() < 28 {
        return Err("数据格式错误".to_string());
    }

    let salt = &data[0..16];
    let nonce_bytes = &data[16..28];
    let ciphertext = &data[28..];

    let mut key = [0u8; 32];
    let argon2 = Argon2::default();
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("密钥派生失败: {}", e))?;

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("创建密码器失败: {}", e))?;

    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("解密失败: {}", e))?;

    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8转换失败: {}", e))
}

/// 用途: 生成随机密码; 输入: 长度和包含字符类型; 输出: 新密码字符串; 必要性: 满足前端快速生成密码需求。
pub fn generate_random_password(
    length: usize,
    include_uppercase: bool,
    include_numbers: bool,
    include_symbols: bool,
) -> Result<String, String> {
    let mut charset = "abcdefghijklmnopqrstuvwxyz".to_string();

    if include_uppercase {
        charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if include_numbers {
        charset.push_str("0123456789");
    }
    if include_symbols {
        charset.push_str("!@#$%^&*()-_=+[]{}|;:,.<>?");
    }

    let chars: Vec<char> = charset.chars().collect();
    let mut rng = rand::thread_rng();

    let password: String = (0..length)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect();

    Ok(password)
}

