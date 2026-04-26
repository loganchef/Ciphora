use std::collections::{HashMap, HashSet};

use chrono::Utc;
use tauri::{AppHandle, State};

use crate::{
    model::{
        AppState,
        BackupFile,
        BackupResponse,
        ImportAnalysis,
        ImportAnalysisResponse,
        ImportConflict,
        ImportProcessResult,
        ImportResolution,
        PasswordEntry,
        RestoreResponse,
    },
    service::password as password_service,
    util::crypto,
};

/// 用途: 分析导入数据; 输入: 待导入记录、主密码; 输出: 冲突与新增列表; 必要性: 提供导入预览。
pub async fn analyze_import_data(
    mut imported: Vec<PasswordEntry>,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportAnalysisResponse, String> {
    for entry in imported.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let existing = password_service::load_passwords(master_password, app, state).await?;
    let mut existing_map: HashMap<String, PasswordEntry> = HashMap::new();
    for entry in &existing {
        existing_map.insert(entry_key(entry), entry.clone());
    }

    let mut conflicts = Vec::new();
    let mut new_items = Vec::new();

    for entry in imported {
        let key = entry_key(&entry);
        if let Some(existing_entry) = existing_map.get(&key) {
            conflicts.push(ImportConflict {
                key,
                imported: entry,
                existing: existing_entry.clone(),
            });
        } else {
            new_items.push(entry);
        }
    }

    Ok(ImportAnalysisResponse {
        success: true,
        requires_preview: !conflicts.is_empty(),
        analysis: ImportAnalysis {
            total: new_items.len() + conflicts.len(),
            new: new_items,
            conflicts,
            existing,
        },
    })
}

/// 用途: 根据用户选择处理导入; 输入: 数据、策略、主密码; 输出: 导入结果; 必要性: 真正写入密码库。
pub async fn process_import_with_resolution(
    mut import_data: Vec<PasswordEntry>,
    resolution: ImportResolution,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ImportProcessResult, String> {
    for entry in import_data.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let existing =
        password_service::load_passwords(master_password.clone(), app.clone(), state.clone()).await?;

    let mut existing_map: HashMap<String, usize> = HashMap::new();
    for (idx, entry) in existing.iter().enumerate() {
        existing_map.insert(entry_key(entry), idx);
    }

    let mut final_passwords = match resolution.mode.as_str() {
        "replace" => import_data.clone(),
        _ => existing.clone(),
    };

    match resolution.mode.as_str() {
        "replace" => {}
        "add" => {
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();
            for entry in import_data {
                let key = entry_key(&entry);
                if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key);
                }
            }
        }
        "update" => {
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();

            for entry in import_data {
                let key = entry_key(&entry);
                let entry_id = entry_id(&entry);
                if let Some(choice) = resolution.conflicts.get(&entry_id) {
                    if choice == "replace" {
                        if let Some(idx) = existing_map.get(&key) {
                            final_passwords[*idx] = entry.clone();
                        } else {
                            final_passwords.push(entry.clone());
                        }
                        existing_map.insert(key.clone(), final_passwords.len() - 1);
                    } else if choice == "both" {
                        // 保留两者：修改导入项的名称并作为新项添加
                        let mut new_entry = entry.clone();
                        let current_website = password_service::get_string_field(&new_entry, "website")
                            .unwrap_or_else(|| "unknown".into());
                        
                        // 修改 website 字段 (或备注) 以示区分
                        if let Some(obj) = new_entry.as_object_mut() {
                            obj.insert("website".to_string(), serde_json::Value::String(format!("{} (Imported)", current_website)));
                            // 重新生成 ID 以避免碰撞
                            obj.insert("id".to_string(), serde_json::Value::String(uuid::Uuid::new_v4().to_string()));
                        }
                        
                        final_passwords.push(new_entry);
                        // 不更新 existing_map，因为这是个新 key
                    }
                    continue;
                }

                if let Some(idx) = existing_map.get(&key) {
                    if is_newer(&entry, &final_passwords[*idx]) {
                        final_passwords[*idx] = entry.clone();
                    }
                } else if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key.clone());
                    existing_map.insert(key, final_passwords.len() - 1);
                }
            }
        }
        _ => {
            // 默认 add
            let mut seen: HashSet<String> =
                final_passwords.iter().map(|e| entry_key(e)).collect();
            for entry in import_data {
                let key = entry_key(&entry);
                if !seen.contains(&key) {
                    final_passwords.push(entry);
                    seen.insert(key);
                }
            }
        }
    }

    password_service::save_passwords(
        final_passwords.clone(),
        master_password,
        app,
        state,
    )
    .await?;

    Ok(ImportProcessResult {
        success: true,
        message: "import_completed".to_string(),
        imported_count: final_passwords.len(),
    })
}

/// 用途: 创建加密备份; 输入: 备份密码、主密码; 输出: 备份数据; 必要性: 允许用户安全备份。
pub async fn create_backup(
    backup_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BackupResponse, String> {
    let passwords =
        password_service::load_passwords(master_password, app.clone(), state.clone()).await?;
    let serialized = serde_json::to_string(&passwords)
        .map_err(|e| format!("serialization_failed: {}", e))?;

    let payload = crypto::encrypt_data(&serialized, &backup_password)?;

    Ok(BackupResponse {
        success: true,
        backup_data: BackupFile {
            version: "1.0".to_string(),
            timestamp: Some(Utc::now().to_rfc3339()),
            payload: Some(payload),
            encrypted: None,
            iv: None,
            salt: None,
        },
    })
}

/// 用途: 从备份恢复; 输入: 备份JSON、备份密码、主密码; 输出: 恢复结果; 必要性: 支持灾难恢复。
pub async fn restore_backup(
    backup_data: BackupFile,
    backup_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RestoreResponse, String> {
    let decrypted_payload = if let Some(payload) = &backup_data.payload {
        crypto::decrypt_data(payload, &backup_password)
            .map_err(|_| "backup_password_incorrect_or_file_corrupted".to_string())?
    } else if let (Some(encrypted), Some(iv)) = (&backup_data.encrypted, &backup_data.iv) {
        // legacy: concatenate iv + ciphertext and尝试解密（假设与 payload 相同格式）
        let legacy_blob = format!("{}{}", encrypted, iv);
        crypto::decrypt_data(&legacy_blob, &backup_password)
            .map_err(|_| "legacy_backup_parse_failed".to_string())?
    } else {
        return Err("unsupported_backup_format".to_string());
    };

    let mut passwords: Vec<PasswordEntry> = serde_json::from_str(&decrypted_payload)
        .map_err(|e| format!("backup_parse_failed: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let count = passwords.len();

    password_service::save_passwords(
        passwords,
        master_password,
        app,
        state,
    )
    .await?;

    Ok(RestoreResponse {
        success: true,
        message: "restore_success".to_string(),
        restored_count: count,
    })
}

/// 用途: 导入 Cimbar 传输载荷; 输入: data(base64或加密串)、share_password_set、分享密码、主密码; 输出: 导入数量; 必要性: 解决 restore_backup 强制解密的问题。
pub async fn import_cimbar_payload(
    data: String,
    share_password_set: bool,
    share_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    use base64::{engine::general_purpose, Engine as _};

    // 1. base64 解码
    let raw_bytes = general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|e| format!("base64_decode_failed: {}", e))?;

    // 2. 可选解密（字节级别）
    let compressed = if share_password_set {
        crypto::decrypt_bytes(&raw_bytes, &share_password)
            .map_err(|_| "share_password_incorrect_or_data_corrupted".to_string())?
    } else {
        raw_bytes
    };

    // 3. zstd 解压
    let json_bytes = zstd::decode_all(compressed.as_slice())
        .map_err(|e| format!("decompression_failed: {}", e))?;

    let json_str = String::from_utf8(json_bytes)
        .map_err(|e| format!("utf8_decode_failed: {}", e))?;

    // 4. 解析 payload: { version, generatedAt, count, entries: [...] }
    let parsed: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("payload_parse_failed: {}", e))?;

    let entries_val = parsed
        .get("entries")
        .cloned()
        .unwrap_or(parsed.clone());

    let mut passwords: Vec<PasswordEntry> = serde_json::from_value(entries_val)
        .map_err(|e| format!("entries_parse_failed: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let count = passwords.len();

    password_service::save_passwords(passwords, master_password, app, state).await?;

    Ok(serde_json::json!({
        "success": true,
        "message": "import_completed",
        "importedCount": count,
    }))
}

/// 用途: 预处理 Cimbar 传输载荷; 输入: data(base64或加密串)、share_password_set、分享密码; 输出: 解密后的密码数组; 必要性: 支持预览后再导入。
pub async fn prepare_cimbar_import(
    data: String,
    share_password_set: bool,
    share_password: Option<String>,
    _master_password: String,
    _app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    use base64::{engine::general_purpose, Engine as _};

    // 1. base64 解码
    let raw_bytes = general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|e| format!("base64_decode_failed: {}", e))?;

    // 2. 可选解密
    let compressed = if share_password_set {
        let pwd = share_password.unwrap_or_default();
        crypto::decrypt_bytes(&raw_bytes, &pwd)
            .map_err(|_| "share_password_incorrect_or_data_corrupted".to_string())?
    } else {
        raw_bytes
    };

    // 3. zstd 解压
    let json_bytes = zstd::decode_all(compressed.as_slice())
        .map_err(|e| format!("decompression_failed: {}", e))?;

    let json_str = String::from_utf8(json_bytes)
        .map_err(|e| format!("utf8_decode_failed: {}", e))?;

    // 4. 解析 payload
    let parsed: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("payload_parse_failed: {}", e))?;

    let entries_val = parsed
        .get("entries")
        .cloned()
        .unwrap_or(parsed.clone());

    let mut passwords: Vec<PasswordEntry> = serde_json::from_value(entries_val)
        .map_err(|e| format!("entries_parse_failed: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
    }

    Ok(serde_json::json!({
        "success": true,
        "passwords": passwords,
    }))
}

fn entry_key(entry: &PasswordEntry) -> String {
    let website = password_service::get_string_field(entry, "website")
        .unwrap_or_else(|| "unknown".into());
    let username = password_service::get_string_field(entry, "username")
        .unwrap_or_else(|| "anonymous".into());
    format!("{}|{}", website, username)
}

fn entry_id(entry: &PasswordEntry) -> String {
    password_service::get_string_field(entry, "id")
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string())
}

fn is_newer(imported: &PasswordEntry, existing: &PasswordEntry) -> bool {
    let imported_ts = password_service::get_string_field(imported, "updatedAt")
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let existing_ts = password_service::get_string_field(existing, "updatedAt")
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    match (imported_ts, existing_ts) {
        (Some(i), Some(e)) => i > e,
        (Some(_), None) => true,
        _ => false,
    }
}

