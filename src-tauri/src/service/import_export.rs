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

    let mut final_passwords = existing.clone();

    // 根据模式执行预处理（如果是 replace 模式，则清空原有内容）
    if resolution.mode == "replace" {
        final_passwords = import_data.clone();
    } else {
        // update 或 add 模式
        let mut seen: HashSet<String> = final_passwords.iter().map(|e| entry_key(e)).collect();

        for entry in import_data {
            let key = entry_key(&entry);
            let entry_id = entry_id(&entry);
            
            // 核心逻辑：优先查看冲突处理字典
            if let Some(choice) = resolution.conflicts.get(&entry_id) {
                match choice.as_str() {
                    "replace" => {
                        if let Some(idx) = existing_map.get(&key) {
                            final_passwords[*idx] = entry.clone();
                        } else {
                            final_passwords.push(entry.clone());
                        }
                    },
                    "both" => {
                        let mut new_entry = entry.clone();
                        let current_website = password_service::get_string_field(&new_entry, "website")
                            .unwrap_or_else(|| "unknown".into());
                        
                        if let Some(obj) = new_entry.as_object_mut() {
                            obj.insert("website".to_string(), serde_json::Value::String(format!("{} (Imported)", current_website)));
                            obj.insert("id".to_string(), serde_json::Value::String(uuid::Uuid::new_v4().to_string()));
                        }
                        final_passwords.push(new_entry);
                    },
                    "keep" => { /* 跳过，不操作 */ },
                    _ => {}
                }
                continue;
            }

            // 非冲突项处理
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

    let count = final_passwords.len();
    password_service::save_passwords(final_passwords, master_password, app, state).await?;

    Ok(ImportProcessResult {
        success: true,
        message: "import_completed".to_string(),
        imported_count: count,
    })
}

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
    } else {
        return Err("unsupported_backup_format".to_string());
    };

    let mut passwords: Vec<PasswordEntry> = serde_json::from_str(&decrypted_payload)
        .map_err(|e| format!("backup_parse_failed: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
    }

    let count = passwords.len();
    password_service::save_passwords(passwords, master_password, app, state).await?;

    Ok(RestoreResponse {
        success: true,
        message: "restore_success".to_string(),
        restored_count: count,
    })
}

pub async fn import_cimbar_payload(
    data: String,
    share_password_set: bool,
    share_password: String,
    master_password: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let res = prepare_cimbar_import(data, share_password_set, Some(share_password), master_password.clone(), app.clone(), state.clone()).await?;
    let passwords: Vec<PasswordEntry> = serde_json::from_value(res.get("passwords").unwrap().clone()).unwrap();
    
    password_service::save_passwords(passwords.clone(), master_password, app, state).await?;

    Ok(serde_json::json!({
        "success": true,
        "message": "import_completed",
        "importedCount": passwords.len(),
    }))
}

pub async fn prepare_cimbar_import(
    data: String,
    share_password_set: bool,
    share_password: Option<String>,
    _master_password: String,
    _app: AppHandle,
    _state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    use base64::{engine::general_purpose, Engine as _};

    let raw_bytes = general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|e| format!("base64_decode_failed: {}", e))?;
// 2. 可选解密
let compressed = if share_password_set {
    let pwd = share_password.unwrap_or_default();
    if pwd.is_empty() {
        // 如果标记了加密但没给密码，通常由 prepare_cimbar_payload 逻辑保证不会发生，
        // 但为了鲁棒性，这里如果确实没密码则尝试原始字节（兼容旧版本或异常流）
        raw_bytes
    } else {
        crypto::decrypt_bytes(&raw_bytes, &pwd)
            .map_err(|_| "share_password_incorrect_or_data_corrupted".to_string())?
    }
} else {
    raw_bytes
};

    let json_bytes = zstd::decode_all(compressed.as_slice())
        .map_err(|e| format!("decompression_failed: {}", e))?;

    let json_str = String::from_utf8(json_bytes)
        .map_err(|e| format!("utf8_decode_failed: {}", e))?;

    let parsed: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("payload_parse_failed: {}", e))?;

    let entries_val = parsed.get("entries").cloned().unwrap_or(parsed.clone());
    let mut passwords: Vec<PasswordEntry> = serde_json::from_value(entries_val)
        .map_err(|e| format!("entries_parse_failed: {}", e))?;

    for entry in passwords.iter_mut() {
        password_service::normalize_entry(entry);
        // 关键点：在返回前端预览前，就强制生成唯一的稳定 ID
        if entry_id(entry).is_empty() {
            if let Some(obj) = entry.as_object_mut() {
                obj.insert("id".to_string(), serde_json::Value::String(uuid::Uuid::new_v4().to_string()));
            }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "passwords": passwords,
    }))
}

fn entry_key(entry: &PasswordEntry) -> String {
    let website = password_service::get_string_field(entry, "website").unwrap_or_else(|| "unknown".into());
    let username = password_service::get_string_field(entry, "username").unwrap_or_else(|| "anonymous".into());
    format!("{}|{}", website, username)
}

fn entry_id(entry: &PasswordEntry) -> String {
    password_service::get_string_field(entry, "id")
        .or_else(|| password_service::get_string_field(entry, "_id"))
        .unwrap_or_default()
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
